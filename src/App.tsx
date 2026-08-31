import './App.css'
import Header from './components/header'
import Navbar from './components/navbar'
import Footer from './components/footer'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Producto = {
  id: number
  name: string
  description: string | null
  price: number
  image: string | null
  category: string | null
  stock: number
  tiene_talle: boolean
  talles: string[]
}

type Variante = {
  id: number
  producto_id: number
  talle: string
  color: string
}

type Imagen = {
  producto_id?: number
  variante_id?: number
  image_url: string
  orden: number
}

function App() {

  const [productos, setProductos] = useState<Producto[]>([])
  const [imagenesPortada, setImagenesPortada] =
    useState<Record<number, string>>({})

  const [carrito, setCarrito] = useState<any[]>([])
  const [mostrarCarrito, setMostrarCarrito] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState('Todos')

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null)

  const [talleSeleccionado, setTalleSeleccionado] =
    useState('')

  const [colorSeleccionado, setColorSeleccionado] =
    useState('')

  const [variantes, setVariantes] = useState<Variante[]>([])

  const [imagenesProducto, setImagenesProducto] =
    useState<string[]>([])

  const [imagenesVariantes, setImagenesVariantes] =
    useState<Record<number, string[]>>({})

  const [fotoActual, setFotoActual] = useState(0)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  const [inicioToque, setInicioToque] =
    useState<number | null>(null)

  // =====================================================
  // CARGAR PRODUCTOS
  // =====================================================

  useEffect(() => {
    cargarProductos()
    cargarFotosPortada()
  }, [])

  async function cargarProductos() {

    const { data, error } = await supabase
      .from('Productos')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error('ERROR PRODUCTOS:', error)
      return
    }

    setProductos((data || []) as Producto[])
  }

  // =====================================================
  // CARGAR IMAGEN DE PORTADA
  // =====================================================

  async function cargarFotosPortada() {

    const mapa: Record<number, string> = {}

    const {
      data: generales,
      error: errorGenerales
    } = await supabase
      .from('ProductoImagenes')
      .select('producto_id, image_url, orden')
      .order('orden', { ascending: true })

    if (errorGenerales) {
      console.error(
        'ERROR FOTOS GENERALES:',
        errorGenerales
      )
    } else {

      ;(generales || []).forEach(
        (imagen: Imagen) => {

          if (
            imagen.producto_id &&
            imagen.image_url?.trim() &&
            !mapa[imagen.producto_id]
          ) {
            mapa[imagen.producto_id] =
              imagen.image_url.trim()
          }

        }
      )
    }

    const {
      data: variantesBD,
      error: errorVariantes
    } = await supabase
      .from('ProductoVariantes')
      .select('id, producto_id')

    if (errorVariantes) {
      console.error(
        'ERROR VARIANTES PORTADA:',
        errorVariantes
      )
    } else if (variantesBD?.length) {

      const ids = variantesBD.map(
        variante => variante.id
      )

      const {
        data: fotosVariantes,
        error: errorFotos
      } = await supabase
        .from('ProductoVarianteImagenes')
        .select('variante_id, image_url, orden')
        .in('variante_id', ids)
        .order('orden', { ascending: true })

      if (errorFotos) {

        console.error(
          'ERROR FOTOS VARIANTES:',
          errorFotos
        )

      } else {

        ;(fotosVariantes || []).forEach(
          (imagen: Imagen) => {

            const variante =
              variantesBD.find(
                v =>
                  v.id ===
                  imagen.variante_id
              )

            if (
              variante &&
              imagen.image_url?.trim() &&
              !mapa[variante.producto_id]
            ) {
              mapa[variante.producto_id] =
                imagen.image_url.trim()
            }

          }
        )
      }
    }

    setImagenesPortada(mapa)
  }

  // =====================================================
  // CARGAR TODAS LAS FOTOS DEL PRODUCTO
  // =====================================================

  async function cargarTodasLasImagenesProducto(
  producto: Producto
) {

  const fotos: string[] = []

  const agregarFoto = (url: string | null | undefined) => {

    if (!url) {
      return
    }

    const limpia = url.trim()

    if (!limpia) {
      return
    }

    // Evita la misma imagen aunque la URL tenga
    // pequeñas diferencias al final.
    const yaExiste = fotos.some(
      foto => foto.trim() === limpia
    )

    if (!yaExiste) {
      fotos.push(limpia)
    }
  }

  // =====================================================
  // 1. FOTO PRINCIPAL DEL PRODUCTO
  // =====================================================

  agregarFoto(producto.image)

  // =====================================================
  // 2. FOTOS GENERALES DEL PRODUCTO
  // =====================================================

  const {
    data: generales,
    error: errorGenerales
  } = await supabase
    .from('ProductoImagenes')
    .select('image_url, orden')
    .eq('producto_id', producto.id)
    .order('orden', { ascending: true })

  if (errorGenerales) {

    console.error(
      'ERROR IMAGENES GENERALES:',
      errorGenerales
    )

  } else {

    ;(generales || []).forEach(
      (imagen: Imagen) => {
        agregarFoto(imagen.image_url)
      }
    )
  }

  // =====================================================
  // 3. BUSCAR VARIANTES DEL PRODUCTO
  // =====================================================

  const {
    data: variantesBD,
    error: errorVariantes
  } = await supabase
    .from('ProductoVariantes')
    .select('id')
    .eq('producto_id', producto.id)

  if (errorVariantes) {

    console.error(
      'ERROR VARIANTES:',
      errorVariantes
    )

  } else if (variantesBD?.length) {

    const ids = variantesBD.map(
      variante => variante.id
    )

    // ===================================================
    // 4. FOTOS DE TODAS LAS VARIANTES
    // ===================================================

    const {
      data: fotosBD,
      error: errorFotos
    } = await supabase
      .from('ProductoVarianteImagenes')
      .select(
        'variante_id, image_url, orden'
      )
      .in(
        'variante_id',
        ids
      )
      .order(
        'orden',
        { ascending: true }
      )

    if (errorFotos) {

      console.error(
        'ERROR FOTOS VARIANTES:',
        errorFotos
      )

    } else {

      ;(fotosBD || []).forEach(
        (imagen: Imagen) => {
          agregarFoto(imagen.image_url)
        }
      )
    }
  }

  console.log(
    'FOTOS FINALES SIN DUPLICADAS:',
    fotos
  )

  setImagenesProducto(fotos)
}

  // =====================================================
  // CARGAR VARIANTES Y FOTOS
  // =====================================================

  async function cargarVariantes(
    productoId: number
  ) {

    const {
      data,
      error
    } = await supabase
      .from('ProductoVariantes')
      .select('*')
      .eq('producto_id', productoId)

    if (error) {

      console.error(
        'ERROR VARIANTES:',
        error
      )

      setVariantes([])
      setImagenesVariantes({})
      return
    }

    const variantesCargadas =
      (data || []) as Variante[]

    setVariantes(
      variantesCargadas
    )

    if (!variantesCargadas.length) {
      setImagenesVariantes({})
      return
    }

    const ids = variantesCargadas.map(
      variante => variante.id
    )

    const {
      data: imagenes,
      error: errorImagenes
    } = await supabase
      .from('ProductoVarianteImagenes')
      .select(
        'variante_id, image_url, orden'
      )
      .in(
        'variante_id',
        ids
      )
      .order(
        'orden',
        { ascending: true }
      )

    if (errorImagenes) {

      console.error(
        'ERROR IMAGENES VARIANTES:',
        errorImagenes
      )

      setImagenesVariantes({})
      return
    }

    const mapa:
      Record<number, string[]> = {}

    variantesCargadas.forEach(
      variante => {
        mapa[variante.id] = []
      }
    )

    ;(imagenes || []).forEach(
      (imagen: Imagen) => {

        if (
          imagen.variante_id &&
          imagen.image_url?.trim()
        ) {

          if (
            !mapa[imagen.variante_id]
          ) {
            mapa[imagen.variante_id] = []
          }

          mapa[
            imagen.variante_id
          ].push(
            imagen.image_url.trim()
          )
        }

      }
    )

    Object.keys(mapa).forEach(
      id => {

        mapa[Number(id)] =
          Array.from(
            new Set(
              mapa[Number(id)]
            )
          )

      }
    )

    setImagenesVariantes(
      mapa
    )
  }

  // =====================================================
  // ABRIR PRODUCTO
  // =====================================================

  const abrirProducto = async (
    producto: Producto
  ) => {

    setProductoSeleccionado(producto)

    setTalleSeleccionado('')
    setColorSeleccionado('')

    setVariantes([])
    setImagenesVariantes({})

    setImagenesProducto([])

    setFotoActual(0)

    setCargandoDetalle(true)

    await cargarTodasLasImagenesProducto(
      producto
    )

    await cargarVariantes(
      producto.id
    )

    setCargandoDetalle(false)
  }

  // =====================================================
  // SELECCIONAR TALLE
  // =====================================================

  const seleccionarTalle = (
    talle: string
  ) => {

    setTalleSeleccionado(talle)
    setColorSeleccionado('')
    setFotoActual(0)
  }

  // =====================================================
  // COLORES DISPONIBLES
  // =====================================================

  const coloresDisponibles =
    variantes
      .filter(
        variante =>
          variante.talle ===
          talleSeleccionado
      )
      .map(
        variante =>
          variante.color
      )
      .filter(
        (
          color,
          index,
          array
        ) =>
          color &&
          array.indexOf(color) === index
      )

  // =====================================================
  // SELECCIONAR COLOR
  // =====================================================

  const seleccionarColor = (
    color: string
  ) => {

    setColorSeleccionado(color)
    setFotoActual(0)

    const variante =
      variantes.find(
        item =>
          item.talle ===
            talleSeleccionado &&
          item.color ===
            color
      )

    if (!variante) {
      return
    }

    const fotos =
      imagenesVariantes[
        variante.id
      ] || []

    if (fotos.length > 0) {

      setImagenesProducto(
        Array.from(
          new Set(fotos)
        )
      )
    }
  }

  // =====================================================
  // CARRITO
  // =====================================================

  const agregarAlCarrito = (
    producto: any
  ) => {

    setCarrito(
      carritoActual => {

        const existe =
          carritoActual.some(
            item =>
              item.id === producto.id &&
              item.talle === producto.talle &&
              item.color === producto.color
          )

        if (existe) {

          return carritoActual.map(
            item =>
              item.id === producto.id &&
              item.talle === producto.talle &&
              item.color === producto.color
                ? {
                    ...item,
                    cantidad:
                      (item.cantidad || 1) + 1
                  }
                : item
          )
        }

        return [
          ...carritoActual,
          {
            ...producto,
            cantidad: 1
          }
        ]
      }
    )
  }

  const quitarDelCarrito = (
    id: number,
    talle: string | null,
    color: string | null
  ) => {

    setCarrito(
      carritoActual =>
        carritoActual
          .map(
            item =>
              item.id === id &&
              item.talle === talle &&
              item.color === color
                ? {
                    ...item,
                    cantidad:
                      (item.cantidad || 1) - 1
                  }
                : item
          )
          .filter(
            item =>
              item.cantidad > 0
          )
    )
  }

  const eliminarDelCarrito = (
    id: number,
    talle: string | null,
    color: string | null
  ) => {

    setCarrito(
      carritoActual =>
        carritoActual.filter(
          item =>
            !(
              item.id === id &&
              item.talle === talle &&
              item.color === color
            )
        )
    )
  }

  const cantidadCarrito =
    carrito.reduce(
      (total, producto) =>
        total +
        (producto.cantidad || 1),
      0
    )

  const totalCarrito =
    carrito.reduce(
      (total, producto) =>
        total +
        Number(producto.price || 0) *
        (producto.cantidad || 1),
      0
    )

  // =====================================================
  // WHATSAPP
  // =====================================================

  const comprarPorWhatsApp = () => {

    if (!carrito.length) {
      return
    }

    let mensaje =
      `Hola LuckePet, quiero realizar el siguiente pedido:\n\n`

    mensaje += `PRODUCTOS\n\n`

    carrito.forEach(
      (producto, index) => {

        const cantidad =
          producto.cantidad || 1

        const precio =
          Number(producto.price || 0)

        const subtotal =
          precio * cantidad

        mensaje +=
          `${index + 1}. ${producto.name}\n`

        if (producto.talle) {
          mensaje +=
            `Talle: ${producto.talle}\n`
        }

        if (producto.color) {
          mensaje +=
            `Color: ${producto.color}\n`
        }

        mensaje +=
          `Cantidad: ${cantidad}\n`

        mensaje +=
          `Precio unitario: $${precio.toLocaleString('es-AR')}\n`

        mensaje +=
          `Subtotal: $${subtotal.toLocaleString('es-AR')}\n\n`
      }
    )

    mensaje +=
      `----------------------------\n\n`

    mensaje +=
      `TOTAL: $${totalCarrito.toLocaleString('es-AR')}\n\n`

    mensaje += `Gracias.`

    const numero =
      '5492664015639'

    const url =
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

    window.open(
      url,
      '_blank'
    )

    setCarrito([])
    setMostrarCarrito(false)
  }

  // =====================================================
  // FILTROS
  // =====================================================

  const productosFiltrados =
    productos
      .filter(
        producto =>
          producto.name
            ?.toLowerCase()
            .includes(
              busqueda.toLowerCase()
            )
      )
      .filter(
        producto =>
          categoriaSeleccionada === 'Todos' ||
          producto.category ===
            categoriaSeleccionada
      )

  // =====================================================
  // FOTOS
  // =====================================================

  const fotoAnterior = () => {

    if (
      imagenesProducto.length <= 1
    ) {
      return
    }

    setFotoActual(
      actual =>
        actual === 0
          ? imagenesProducto.length - 1
          : actual - 1
    )
  }

  const fotoSiguiente = () => {

    if (
      imagenesProducto.length <= 1
    ) {
      return
    }

    setFotoActual(
      actual =>
        actual ===
        imagenesProducto.length - 1
          ? 0
          : actual + 1
    )
  }

  // =====================================================
  // SWIPE CELULAR
  // =====================================================

  const manejarTouchStart = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {

    setInicioToque(
      e.touches[0].clientX
    )
  }

  const manejarTouchEnd = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {

    if (inicioToque === null) {
      return
    }

    const final =
      e.changedTouches[0].clientX

    const diferencia =
      inicioToque - final

    if (
      Math.abs(diferencia) >= 50
    ) {

      if (diferencia > 0) {
        fotoSiguiente()
      } else {
        fotoAnterior()
      }

    }

    setInicioToque(null)
  }

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <div className="app">

      <Header
        setMostrarCarrito={setMostrarCarrito}
        cantidadCarrito={cantidadCarrito}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
      />

      <Navbar
        categoriaSeleccionada={
          categoriaSeleccionada
        }
        setCategoriaSeleccionada={
          setCategoriaSeleccionada
        }
      />

      {mostrarCarrito && (

        <div className="carrito-lateral">

          <div className="carrito-header">

            <h2>
              🛒 Mi carrito
            </h2>

            <button
              className="cerrar-carrito"
              onClick={() =>
                setMostrarCarrito(false)
              }
            >
              ×
            </button>

          </div>

          {carrito.length === 0 ? (

            <p>
              Tu carrito está vacío
            </p>

          ) : (

            <>
              {carrito.map(producto => (

                <div
                  className="item-carrito"
                  key={`${producto.id}-${producto.talle || 'sin-talle'}-${producto.color || 'sin-color'}`}
                >

                  <img
                    src={
                      producto.image ||
                      imagenesPortada[
                        producto.id
                      ] ||
                      ''
                    }
                    alt={producto.name}
                  />

                  <div className="info-carrito">

                    <h4>
                      {producto.name}
                    </h4>

                    {producto.talle && (
                      <p>
                        Talle: {producto.talle}
                      </p>
                    )}

                    {producto.color && (
                      <p>
                        Color: {producto.color}
                      </p>
                    )}

                    <p>
                      $
                      {Number(
                        producto.price
                      ).toLocaleString('es-AR')}
                    </p>

                    <div className="cantidad-carrito">

                      <button
                        onClick={() =>
                          quitarDelCarrito(
                            producto.id,
                            producto.talle,
                            producto.color
                          )
                        }
                      >
                        −
                      </button>

                      <span>
                        {producto.cantidad}
                      </span>

                      <button
                        onClick={() =>
                          agregarAlCarrito(
                            producto
                          )
                        }
                      >
                        +
                      </button>

                    </div>

                    <button
                      className="eliminar-carrito"
                      onClick={() =>
                        eliminarDelCarrito(
                          producto.id,
                          producto.talle,
                          producto.color
                        )
                      }
                    >
                      Eliminar
                    </button>

                  </div>

                </div>

              ))}

              <div className="total-carrito">

                <div>

                  <span>
                    Total
                  </span>

                  <strong>
                    $
                    {totalCarrito.toLocaleString(
                      'es-AR'
                    )}
                  </strong>

                </div>

                <button
                  className="boton-comprar"
                  onClick={
                    comprarPorWhatsApp
                  }
                >
                  Comprar por WhatsApp
                </button>

              </div>
            </>

          )}

        </div>

      )}

      <section className="productos">

        <div className="tarjetas">

          {productosFiltrados.length === 0 ? (

            <div className="sin-productos">

              <h3>
                🐾 No encontramos productos
              </h3>

              <p>
                Probá buscando otro producto.
              </p>

            </div>

          ) : (

            productosFiltrados.map(
              producto => {

                const imagenPortada =
                  producto.image?.trim() ||
                  imagenesPortada[
                    producto.id
                  ] ||
                  ''

                return (

                  <div
                    className="tarjeta"
                    key={producto.id}
                    onClick={() =>
                      abrirProducto(producto)
                    }
                  >

                    <div className="imagen-producto">

                      {imagenPortada ? (

                        <img
                          src={imagenPortada}
                          alt={producto.name}
                          onError={e => {
                            e.currentTarget.style.display =
                              'none'
                          }}
                        />

                      ) : (

                        <div
                          style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Sin imagen
                        </div>

                      )}

                    </div>

                    <div className="info-producto">

                      <h3>
                        {producto.name}
                      </h3>

                      <div className="precio-carrito">

                        <strong className="precio">
                          $
                          {Number(
                            producto.price
                          ).toLocaleString(
                            'es-AR'
                          )}
                        </strong>

                        <button
                          className="boton-agregar"
                          onClick={e => {

                            e.stopPropagation()

                            if (
                              producto.tiene_talle
                            ) {

                              abrirProducto(
                                producto
                              )

                              return
                            }

                            agregarAlCarrito({
                              ...producto,
                              talle: null,
                              color: null,
                              image:
                                imagenPortada
                            })

                          }}
                        >
                          +
                        </button>

                      </div>

                    </div>

                  </div>

                )
              }
            )

          )}

        </div>

      </section>
      {/* =================================================
          DETALLE DEL PRODUCTO
      ================================================= */}

      {productoSeleccionado && (

        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#f0ead2',
            zIndex: 99999,
            width: '100vw',
            height: '100vh',
            overflowY: 'auto'
          }}
        >

          {/* CERRAR */}

          <button
            onClick={() => {

              setProductoSeleccionado(null)
              setTalleSeleccionado('')
              setColorSeleccionado('')
              setVariantes([])
              setImagenesVariantes({})
              setImagenesProducto([])
              setFotoActual(0)

            }}
            style={{
              position: 'fixed',
              top: '15px',
              right: '15px',
              zIndex: 100000,
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.9)',
              fontSize: '30px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>

          {/* NOMBRE */}

          <h1
            style={{
              margin: 0,
              padding: '25px 70px 15px',
              textAlign: 'center',
              fontSize: '28px'
            }}
          >
            {productoSeleccionado.name}
          </h1>

          {/* =================================================
              FOTOS + DESLIZAMIENTO
          ================================================= */}

          <div
            onTouchStart={manejarTouchStart}
            onTouchEnd={manejarTouchEnd}
            style={{
              width: '100%',
              height: '65vh',
              minHeight: '300px',
              background: '#fff',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              touchAction: 'pan-y'
            }}
          >

            {cargandoDetalle ? (

              <div
                style={{
                  color: '#999',
                  fontSize: '16px'
                }}
              >
                Cargando imágenes...
              </div>

            ) : imagenesProducto.length > 0 ? (

              <img
                src={
                  imagenesProducto[
                    fotoActual
                  ]
                }
                alt={
                  productoSeleccionado.name
                }
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              />

            ) : (

              <div
                style={{
                  color: '#999',
                  fontSize: '16px'
                }}
              >
                Sin imagen
              </div>

            )}

            {/* BOTÓN ANTERIOR */}

            {imagenesProducto.length > 1 && (

              <button
                onClick={fotoAnterior}
                style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  background: 'rgba(255,255,255,0.9)',
                  fontSize: '30px',
                  cursor: 'pointer',
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                ‹
              </button>

            )}

            {/* BOTÓN SIGUIENTE */}

            {imagenesProducto.length > 1 && (

              <button
                onClick={fotoSiguiente}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  background: 'rgba(255,255,255,0.9)',
                  fontSize: '30px',
                  cursor: 'pointer',
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                ›
              </button>

            )}

            {/* CONTADOR */}

            {imagenesProducto.length > 1 && (

              <div
                style={{
                  position: 'absolute',
                  bottom: '15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px'
                }}
              >
                {fotoActual + 1} / {imagenesProducto.length}
              </div>

            )}

          </div>

          {/* =================================================
              MINIATURAS
          ================================================= */}

          {imagenesProducto.length > 1 && (

            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 15px',
                overflowX: 'auto',
                background: '#f0ead2',
                justifyContent: 'flex-start'
              }}
            >

              {imagenesProducto.map(
                (imagen, index) => (

                  <button
                    key={`${imagen}-${index}`}
                    onClick={() =>
                      setFotoActual(index)
                    }
                    style={{
                      padding: 0,
                      border:
                        fotoActual === index
                          ? '3px solid #123622'
                          : '2px solid transparent',
                      borderRadius: '8px',
                      background: 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >

                    <img
                      src={imagen}
                      alt=""
                      style={{
                        width: '65px',
                        height: '65px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        display: 'block'
                      }}
                    />

                  </button>

                )
              )}

            </div>

          )}

          {/* =================================================
              INFORMACIÓN
          ================================================= */}

          <div
            style={{
              padding: '25px 20px 40px',
              maxWidth: '600px',
              margin: '0 auto'
            }}
          >

            {/* PRECIO */}

            <h2
              style={{
                margin: '0 0 25px',
                fontSize: '25px'
              }}
            >
              $
              {Number(
                productoSeleccionado.price
              ).toLocaleString('es-AR')}
            </h2>

            {/* DESCRIPCIÓN */}

            {productoSeleccionado.description && (

              <p
                style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '25px'
                }}
              >
                {productoSeleccionado.description}
              </p>

            )}

            {/* =================================================
                TALLES
            ================================================= */}

            {productoSeleccionado.tiene_talle && (

              <div
                style={{
                  marginBottom: '25px'
                }}
              >

                <p
                  style={{
                    fontWeight: 'bold',
                    marginBottom: '12px'
                  }}
                >
                  Seleccionar talle
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >

                  {(productoSeleccionado.talles || []).map(
                    talle => (

                      <button
                        key={talle}
                        onClick={() =>
                          seleccionarTalle(talle)
                        }
                        style={{
                          minWidth: '55px',
                          padding: '12px 18px',
                          borderRadius: '10px',
                          border:
                            talleSeleccionado === talle
                              ? '2px solid #123622'
                              : '1px solid #ccc',
                          background:
                            talleSeleccionado === talle
                              ? '#123622'
                              : '#fff',
                          color:
                            talleSeleccionado === talle
                              ? '#fff'
                              : '#333',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {talle}
                      </button>

                    )
                  )}

                </div>

              </div>

            )}

            {/* =================================================
                COLORES
            ================================================= */}

            {productoSeleccionado.tiene_talle &&
              talleSeleccionado &&
              coloresDisponibles.length > 0 && (

              <div
                style={{
                  marginBottom: '25px'
                }}
              >

                <p
                  style={{
                    fontWeight: 'bold',
                    marginBottom: '12px'
                  }}
                >
                  Seleccionar color
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >

                  {coloresDisponibles.map(
                    color => (

                      <button
                        key={color}
                        onClick={() =>
                          seleccionarColor(color)
                        }
                        style={{
                          padding: '12px 18px',
                          borderRadius: '10px',
                          border:
                            colorSeleccionado === color
                              ? '2px solid #123622'
                              : '1px solid #ccc',
                          background:
                            colorSeleccionado === color
                              ? '#123622'
                              : '#fff',
                          color:
                            colorSeleccionado === color
                              ? '#fff'
                              : '#333',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {color}
                      </button>

                    )
                  )}

                </div>

              </div>

            )}

            {/* =================================================
                AGREGAR AL CARRITO
            ================================================= */}

            <button
              onClick={() => {

                if (
                  productoSeleccionado.tiene_talle &&
                  !talleSeleccionado
                ) {

                  alert(
                    'Seleccioná un talle.'
                  )

                  return
                }

                if (
                  productoSeleccionado.tiene_talle &&
                  variantes.length > 0 &&
                  !colorSeleccionado
                ) {

                  alert(
                    'Seleccioná un color.'
                  )

                  return
                }

                const varianteSeleccionada =
                  variantes.find(
                    variante =>
                      variante.talle ===
                        talleSeleccionado &&
                      variante.color ===
                        colorSeleccionado
                  )

                const imagenCarrito =
                  imagenesProducto[0] ||
                  imagenesPortada[
                    productoSeleccionado.id
                  ] ||
                  productoSeleccionado.image ||
                  ''

                agregarAlCarrito({

                  ...productoSeleccionado,

                  talle:
                    talleSeleccionado ||
                    null,

                  color:
                    colorSeleccionado ||
                    null,

                  image:
                    imagenCarrito,

                  variante_id:
                    varianteSeleccionada?.id ||
                    null

                })

                setTalleSeleccionado('')
                setColorSeleccionado('')
                setProductoSeleccionado(null)
                setVariantes([])
                setImagenesVariantes({})
                setImagenesProducto([])
                setFotoActual(0)

              }}
              style={{
                width: '100%',
                padding: '17px',
                borderRadius: '12px',
                border: 'none',
                background: '#123622',
                color: '#fff',
                fontSize: '17px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Agregar al carrito
            </button>

          </div>

        </div>

      )}

      <Footer />

    </div>
  )
}

export default App