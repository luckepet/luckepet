import './App.css'

import Header from './components/header'
import Navbar from './components/navbar'
import Footer from './components/footer'

import { useEffect, useState } from 'react'
import type { TouchEvent } from 'react'

import { supabase } from './lib/supabase'

type Producto = {
  id: number
  name: string
  description: string | null
  price: number
  image: string | null
  category: string[] | string | null
  stock: number
  tiene_talle: boolean
  talles: string[]
}

type Variante = {
  id: number
  producto_id: number
  talle: string
  color: string
  precio: number
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

  const [talleSeleccionado, setTalleSeleccionado] = useState('')
  const [colorSeleccionado, setColorSeleccionado] = useState('')

  const [variantes, setVariantes] = useState<Variante[]>([])

  const [imagenesProducto, setImagenesProducto] =
    useState<string[]>([])

  const [imagenesVariantes, setImagenesVariantes] =
    useState<Record<number, string[]>>({})

  const [imagenesGenerales, setImagenesGenerales] =
    useState<string[]>([])

  const [fotoActual, setFotoActual] = useState(0)

  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  const [imagenAmpliada, setImagenAmpliada] =
    useState(false)

  const [inicioToque, setInicioToque] =
    useState<number | null>(null)

  // =====================================================
  // NORMALIZAR URL
  // =====================================================

  const normalizarUrl = (valor: string) => {
    try {
      const url = new URL(valor)

      return decodeURIComponent(url.pathname)
        .replace('/storage/v1/object/public/', '')
        .replace('/storage/v1/object/sign/', '')
        .replace('/storage/v1/object/authenticated/', '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .toLowerCase()
    } catch {
      return valor
        .split('?')[0]
        .split('#')[0]
        .trim()
        .toLowerCase()
    }
  }

  // =====================================================
  // FOTOS ÚNICAS
  // =====================================================

  const fotosUnicas = (fotos: string[]) => {
    const resultado: string[] = []
    const utilizadas = new Set<string>()

    fotos.forEach(foto => {
      if (!foto) return

      const limpia = foto.trim()

      if (!limpia) return

      const clave = normalizarUrl(limpia)

      if (!utilizadas.has(clave)) {
        utilizadas.add(clave)
        resultado.push(limpia)
      }
    })

    return resultado
  }

  // =====================================================
  // CARGAR TODO
  // =====================================================

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    if (productos.length > 0) {
      cargarFotosPortada()
    }
  }, [productos])

  // =====================================================
  // HISTORIAL DEL NAVEGADOR
  // =====================================================

  useEffect(() => {
    if (!window.history.state?.luckepetBase) {
      window.history.replaceState(
        {
          luckepetBase: true
        },
        '',
        window.location.href
      )
    }

    const manejarAtras = () => {
      if (productoSeleccionado) {
        setProductoSeleccionado(null)
        setTalleSeleccionado('')
        setColorSeleccionado('')
        setVariantes([])
        setImagenesVariantes({})
        setImagenesProducto([])
        setImagenesGenerales([])
        setFotoActual(0)
        setImagenAmpliada(false)
      }
    }

    window.addEventListener('popstate', manejarAtras)

    return () => {
      window.removeEventListener(
        'popstate',
        manejarAtras
      )
    }
  }, [productoSeleccionado])

  // =====================================================
  // PRODUCTOS
  // =====================================================

  async function cargarProductos() {
    const { data, error } = await supabase
      .from('Productos')
      .select('*')
      .order('id', {
        ascending: false
      })

    if (error) {
      console.error(
        'ERROR PRODUCTOS:',
        error
      )
      return
    }

    setProductos((data || []) as Producto[])
  }

  // =====================================================
  // FOTOS DE PORTADA
  // =====================================================

  async function cargarFotosPortada() {
    const mapa: Record<number, string> = {}

    const { data, error } = await supabase
      .from('ProductoImagenes')
      .select('producto_id, image_url, orden')
      .order('orden', {
        ascending: true
      })

    if (error) {
      console.error(
        'ERROR FOTOS PORTADA:',
        error
      )
    } else {
      ;(data || []).forEach((imagen: Imagen) => {
        if (
          imagen.producto_id &&
          imagen.image_url?.trim() &&
          !mapa[imagen.producto_id]
        ) {
          mapa[imagen.producto_id] =
            imagen.image_url.trim()
        }
      })
    }

    productos.forEach(producto => {
      if (
        !mapa[producto.id] &&
        producto.image?.trim()
      ) {
        mapa[producto.id] =
          producto.image.trim()
      }
    })

    setImagenesPortada(mapa)
  }

  // =====================================================
  // CARGAR FOTOS GENERALES
  // =====================================================

  async function cargarImagenesGenerales(
    producto: Producto
  ) {
    let fotos: string[] = []

    if (producto.image?.trim()) {
      fotos.push(producto.image.trim())
    }

    const {
      data,
      error
    } = await supabase
      .from('ProductoImagenes')
      .select('image_url, orden')
      .eq('producto_id', producto.id)
      .order('orden', {
        ascending: true
      })

    if (error) {
      console.error(
        'ERROR IMAGENES GENERALES:',
        error
      )
    } else {
      ;(data || []).forEach((imagen: Imagen) => {
        if (imagen.image_url?.trim()) {
          fotos.push(
            imagen.image_url.trim()
          )
        }
      })
    }

    return fotosUnicas(fotos)
  }

  // =====================================================
  // CARGAR TODAS LAS IMÁGENES DEL PRODUCTO
  // =====================================================

  async function cargarTodasLasImagenesProducto(
    producto: Producto
  ) {
    const fotosGenerales =
      await cargarImagenesGenerales(producto)

    setImagenesGenerales(fotosGenerales)

    // IMPORTANTE:
    // al abrir el producto SIEMPRE empiezan
    // las imágenes generales.
    setImagenesProducto(fotosGenerales)

    setFotoActual(0)
  }

  // =====================================================
  // VARIANTES
  // =====================================================

  async function cargarVariantes(
    productoId: number
  ) {
    const {
      data,
      error
    } = await supabase
      .from('ProductoVariantes')
      .select(
        'id, producto_id, talle, color, precio'
      )
      .eq('producto_id', productoId)
      .order('id', {
        ascending: true
      })

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
      (data || []).map(variante => ({
        ...variante,
        precio: Number(
          variante.precio || 0
        )
      })) as Variante[]

    setVariantes(variantesCargadas)

    if (variantesCargadas.length === 0) {
      setImagenesVariantes({})
      return
    }

    const ids =
      variantesCargadas.map(
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
      .in('variante_id', ids)
      .order('orden', {
        ascending: true
      })

    if (errorImagenes) {
      console.error(
        'ERROR IMAGENES VARIANTES:',
        errorImagenes
      )

      setImagenesVariantes({})

      return
    }

    const mapa: Record<number, string[]> = {}

    variantesCargadas.forEach(variante => {
      mapa[variante.id] = []
    })

    ;(imagenes || []).forEach(
      (imagen: Imagen) => {
        if (
          imagen.variante_id &&
          imagen.image_url?.trim()
        ) {
          if (!mapa[imagen.variante_id]) {
            mapa[imagen.variante_id] = []
          }

          mapa[imagen.variante_id].push(
            imagen.image_url.trim()
          )
        }
      }
    )

    Object.keys(mapa).forEach(id => {
      const varianteId = Number(id)

      mapa[varianteId] =
        fotosUnicas(
          mapa[varianteId]
        )
    })

    setImagenesVariantes(mapa)
  }

  // =====================================================
  // ABRIR PRODUCTO
  // =====================================================

  const abrirProducto = async (
    producto: Producto
  ) => {
    window.history.pushState(
      {
        luckepetProducto: true,
        productoId: producto.id
      },
      '',
      window.location.href
    )

    setProductoSeleccionado(producto)

    setTalleSeleccionado('')
    setColorSeleccionado('')

    setVariantes([])
    setImagenesVariantes({})

    setImagenesProducto([])
    setImagenesGenerales([])

    setFotoActual(0)
    setImagenAmpliada(false)

    setCargandoDetalle(true)

    // Primero cargamos imágenes generales
    await cargarTodasLasImagenesProducto(
      producto
    )

    // Después variantes
    await cargarVariantes(
      producto.id
    )

    setCargandoDetalle(false)
  }

  // =====================================================
  // CERRAR PRODUCTO
  // =====================================================

  const cerrarProducto = () => {
    if (
      window.history.state?.luckepetProducto
    ) {
      window.history.back()
      return
    }

    setProductoSeleccionado(null)

    setTalleSeleccionado('')
    setColorSeleccionado('')

    setVariantes([])
    setImagenesVariantes({})

    setImagenesProducto([])
    setImagenesGenerales([])

    setFotoActual(0)
    setImagenAmpliada(false)
  }

  // =====================================================
  // TALLE
  // =====================================================

  const seleccionarTalle = (
    talle: string
  ) => {
    setTalleSeleccionado(talle)

    // Cada vez que cambia el talle,
    // se limpia el color anterior.
    setColorSeleccionado('')

    // Volvemos a las imágenes generales
    // hasta que el usuario elija un color.
    setImagenesProducto(
      imagenesGenerales
    )

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
          array.indexOf(color) ===
            index
      )

  // =====================================================
  // COLOR
  // =====================================================

  const seleccionarColor = (
    color: string
  ) => {
    setColorSeleccionado(color)

    setFotoActual(0)

    // BUSCAMOS LA VARIANTE EXACTA
    // talle + color
    const variante = variantes.find(
      item =>
        item.talle ===
          talleSeleccionado &&
        item.color === color
    )

    if (!variante) {
      setImagenesProducto(
        imagenesGenerales
      )
      return
    }

    // Buscamos las imágenes de ESA variante
    const fotosColor =
      imagenesVariantes[
        variante.id
      ] || []

    if (fotosColor.length > 0) {
      setImagenesProducto(
        fotosUnicas(
          fotosColor
        )
      )
    } else {
      // Si no tiene imágenes propias,
      // usamos las generales.
      setImagenesProducto(
        imagenesGenerales
      )
    }
  }

  // =====================================================
  // VARIANTE EXACTA
  // =====================================================

  const obtenerVarianteSeleccionada = () => {
    if (
      !talleSeleccionado ||
      !colorSeleccionado
    ) {
      return null
    }

    return (
      variantes.find(
        variante =>
          variante.talle ===
            talleSeleccionado &&
          variante.color ===
            colorSeleccionado
      ) || null
    )
  }

  // =====================================================
  // PRECIO ACTUAL
  // =====================================================

  const obtenerPrecioActual = () => {
    if (!productoSeleccionado) {
      return 0
    }

    // Producto sin variantes
    if (variantes.length === 0) {
      return Number(
        productoSeleccionado.price || 0
      )
    }

    // TALLE + COLOR
    const varianteExacta =
      obtenerVarianteSeleccionada()

    if (varianteExacta) {
      return Number(
        varianteExacta.precio || 0
      )
    }

    // SOLO TALLE
    if (talleSeleccionado) {
      const variantesDelTalle =
        variantes.filter(
          variante =>
            variante.talle ===
            talleSeleccionado
        )

      if (
        variantesDelTalle.length > 0
      ) {
        const precios =
          variantesDelTalle
            .map(
              variante =>
                Number(
                  variante.precio || 0
                )
            )
            .filter(
              precio =>
                precio > 0
            )

        if (
          precios.length > 0
        ) {
          // Si hay distintos precios por color,
          // mostramos el menor hasta elegir color.
          return Math.min(
            ...precios
          )
        }
      }
    }

    return Number(
      productoSeleccionado.price || 0
    )
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
              item.id ===
                producto.id &&
              item.talle ===
                producto.talle &&
              item.color ===
                producto.color
          )

        if (existe) {
          return carritoActual.map(
            item =>
              item.id ===
                  producto.id &&
                item.talle ===
                  producto.talle &&
                item.color ===
                  producto.color
                ? {
                    ...item,
                    cantidad:
                      (item.cantidad ||
                        1) + 1
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
          .map(item =>
            item.id === id &&
            item.talle === talle &&
            item.color === color
              ? {
                  ...item,
                  cantidad:
                    (item.cantidad ||
                      1) - 1
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
        Number(
          producto.price || 0
        ) *
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

    mensaje +=
      `PRODUCTOS\n\n`

    carrito.forEach(
      (
        producto,
        index
      ) => {
        const cantidad =
          producto.cantidad || 1

        const precio =
          Number(
            producto.price || 0
          )

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
          `Precio unitario: $${precio.toLocaleString(
            'es-AR'
          )}\n`

        mensaje +=
          `Subtotal: $${subtotal.toLocaleString(
            'es-AR'
          )}\n\n`
      }
    )

    mensaje +=
      `----------------------------\n\n`

    mensaje +=
      `TOTAL: $${totalCarrito.toLocaleString(
        'es-AR'
      )}\n\n`

    mensaje +=
      `Gracias.`

    const numero =
      '5492664015639'

    const url =
      `https://wa.me/${numero}?text=${encodeURIComponent(
        mensaje
      )}`

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
          categoriaSeleccionada ===
            'Todos' ||
          (
            Array.isArray(
              producto.category
            )
              ? producto.category
              : producto.category
                ? [producto.category]
                : []
          ).includes(
            categoriaSeleccionada
          )
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
  // SWIPE
  // =====================================================

  const manejarTouchStart = (
    e: TouchEvent<HTMLDivElement>
  ) => {
    setInicioToque(
      e.touches[0].clientX
    )
  }

  const manejarTouchEnd = (
    e: TouchEvent<HTMLDivElement>
  ) => {
    if (
      inicioToque === null
    ) {
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
        setMostrarCarrito={
          setMostrarCarrito
        }
        cantidadCarrito={
          cantidadCarrito
        }
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

      {/* =================================================
          CARRITO
      ================================================= */}

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
              {carrito.map(
                producto => (

                  <div
                    className="item-carrito"
                    key={
                      `${producto.id}-${producto.talle || 'sin-talle'}-${producto.color || 'sin-color'}`
                    }
                  >

                    <img
                      src={
                        producto.image ||
                        imagenesPortada[
                          producto.id
                        ] ||
                        ''
                      }
                      alt={
                        producto.name
                      }
                    />

                    <div className="info-carrito">

                      <h4>
                        {
                          producto.name
                        }
                      </h4>

                      {producto.talle && (
                        <p>
                          Talle:{' '}
                          {
                            producto.talle
                          }
                        </p>
                      )}

                      {producto.color && (
                        <p>
                          Color:{' '}
                          {
                            producto.color
                          }
                        </p>
                      )}

                      <p>
                        $
                        {Number(
                          producto.price
                        ).toLocaleString(
                          'es-AR'
                        )}
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
                          {
                            producto.cantidad
                          }
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
                )
              )}

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

      {/* =================================================
          PRODUCTOS
      ================================================= */}

      <section className="productos">

        <div className="tarjetas">

          {productosFiltrados.length === 0 ? (

            <div className="sin-productos">

              <h3>
                🐾 No encontramos
                productos
              </h3>

              <p>
                Probá buscando otro
                producto.
              </p>

            </div>

          ) : (

            productosFiltrados.map(
              producto => {

                const imagenPortada =
                  imagenesPortada[
                    producto.id
                  ] ||
                  producto.image?.trim() ||
                  ''

                return (

                  <div
                    className="tarjeta"
                    key={
                      producto.id
                    }
                    onClick={() =>
                      abrirProducto(
                        producto
                      )
                    }
                  >

                    <div className="imagen-producto">

                      {imagenPortada ? (

                        <img
                          src={
                            imagenPortada
                          }
                          alt={
                            producto.name
                          }
                          loading="lazy"
                          decoding="async"
                          width="800"
                          height="800"
                          onError={e => {
                            console.error(
                              'ERROR IMAGEN PORTADA:',
                              imagenPortada
                            )

                            e.currentTarget.style.display =
                              'none'
                          }}
                        />

                      ) : (

                        <div
                          style={{
                            height:
                              '100%',
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center'
                          }}
                        >
                          Sin imagen
                        </div>

                      )}

                    </div>

                    <div className="info-producto">

                      <h3>
                        {
                          producto.name
                        }
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
          PRODUCTO SELECCIONADO
      ================================================= */}

      {productoSeleccionado && (
        <>

          {/* =================================================
              IMAGEN AMPLIADA
          ================================================= */}

          {imagenAmpliada &&
            imagenesProducto.length > 0 && (

              <div
                className="imagen-ampliada-overlay"
                onClick={() =>
                  setImagenAmpliada(false)
                }
              >

                <button
                  className="imagen-ampliada-cerrar"
                  onClick={() =>
                    setImagenAmpliada(false)
                  }
                >
                  ×
                </button>

                {imagenesProducto.length > 1 && (

                  <button
                    className="imagen-ampliada-flecha izquierda"
                    onClick={e => {
                      e.stopPropagation()
                      fotoAnterior()
                    }}
                  >
                    ‹
                  </button>

                )}

                <img
                  src={
                    imagenesProducto[
                      fotoActual
                    ]
                  }
                  alt={
                    productoSeleccionado.name
                  }
                  className="imagen-ampliada"
                  onClick={e =>
                    e.stopPropagation()
                  }
                />

                {imagenesProducto.length > 1 && (

                  <button
                    className="imagen-ampliada-flecha derecha"
                    onClick={e => {
                      e.stopPropagation()
                      fotoSiguiente()
                    }}
                  >
                    ›
                  </button>

                )}

                {imagenesProducto.length > 1 && (

                  <div className="imagen-ampliada-contador">

                    {fotoActual + 1} /{' '}

                    {
                      imagenesProducto.length
                    }

                  </div>

                )}

              </div>
            )}

          {/* =================================================
              DETALLE
          ================================================= */}

          <div className="producto-overlay">

            <div className="producto-detalle">

              <div className="producto-detalle-header">

                <button
                  className="producto-volver"
                  onClick={
                    cerrarProducto
                  }
                >
                  ←
                </button>

                <span>
                  Producto
                </span>

                <button
                  className="producto-cerrar"
                  onClick={
                    cerrarProducto
                  }
                >
                  ×
                </button>

              </div>

              {/* =================================================
                  GALERÍA
              ================================================= */}

              <div
                className="producto-galeria"
                onTouchStart={
                  manejarTouchStart
                }
                onTouchEnd={
                  manejarTouchEnd
                }
              >

                {cargandoDetalle ? (

                  <div className="producto-cargando">
                    Cargando imágenes...
                  </div>

                ) : imagenesProducto.length > 0 ? (

               <img
  src={imagenesProducto[fotoActual]}
  alt={productoSeleccionado.name}
  className="producto-foto-principal"
  width="800"
  height="800"
  onClick={(e) => {
    e.stopPropagation()
    setImagenAmpliada(true)
  }}
                    onError={e => {

                      console.error(
                        'ERROR MOSTRANDO IMAGEN:',
                        imagenesProducto[
                          fotoActual
                        ]
                      )

                      e.currentTarget.style.display =
                        'none'
                    }}
                    style={{
                      cursor:
                        'zoom-in'
                    }}
                  />

                ) : (

                  <div className="producto-sin-imagen">
                    Sin imagen
                  </div>

                )}

                {imagenesProducto.length > 1 && (

                  <>

                    <button
                      className="galeria-flecha galeria-anterior"
                      onClick={
                        fotoAnterior
                      }
                    >
                      ‹
                    </button>

                    <button
                      className="galeria-flecha galeria-siguiente"
                      onClick={
                        fotoSiguiente
                      }
                    >
                      ›
                    </button>

                    <div className="galeria-contador">

                      {fotoActual + 1} /{' '}

                      {
                        imagenesProducto.length
                      }

                    </div>

                  </>

                )}

              </div>

              {/* =================================================
                  MINIATURAS
              ================================================= */}

              {imagenesProducto.length > 1 && (

                <div className="producto-miniaturas">

                  {imagenesProducto.map(
                    (
                      imagen,
                      index
                    ) => (

                      <button
                        key={`${normalizarUrl(
                          imagen
                        )}-${index}`}
                        className={
                          fotoActual ===
                          index
                            ? 'miniatura activa'
                            : 'miniatura'
                        }
                        onClick={() =>
                          setFotoActual(
                            index
                          )
                        }
                      >

                        <img
                          src={imagen}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width="150"
                          height="150"
                        />

                      </button>

                    )
                  )}

                </div>
              )}

              {/* =================================================
                  INFORMACIÓN
              ================================================= */}

              <div className="producto-info-detalle">

                <div className="producto-categoria">

                  {Array.isArray(
                    productoSeleccionado.category
                  )
                    ? productoSeleccionado.category.join(
                        ' · '
                      )
                    : productoSeleccionado.category ||
                      'Producto'}

                </div>

                <h1>
                  {
                    productoSeleccionado.name
                  }
                </h1>

                <div className="producto-precio">

                  $
                  {obtenerPrecioActual().toLocaleString(
                    'es-AR'
                  )}

                </div>

                {productoSeleccionado.description && (

                  <div className="producto-descripcion">

                    <h3>
                      Descripción
                    </h3>

                    <p>
                      {
                        productoSeleccionado.description
                      }
                    </p>

                  </div>

                )}

                {/* =================================================
                    TALLES
                ================================================= */}

                {productoSeleccionado.tiene_talle && (

                  <div className="selector-producto">

                    <div className="selector-titulo">

                      <strong>
                        Talle
                      </strong>

                      {talleSeleccionado && (

                        <span>
                          {
                            talleSeleccionado
                          }
                        </span>

                      )}

                    </div>

                    <div className="opciones-producto">

                      {(
                        productoSeleccionado.talles ||
                        []
                      ).map(
                        talle => (

                          <button
                            key={talle}
                            className={
                              talleSeleccionado ===
                              talle
                                ? 'opcion-producto seleccionada'
                                : 'opcion-producto'
                            }
                            onClick={() =>
                              seleccionarTalle(
                                talle
                              )
                            }
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

                    <div className="selector-producto">

                      <div className="selector-titulo">

                        <strong>
                          Color
                        </strong>

                        {colorSeleccionado && (

                          <span>
                            {
                              colorSeleccionado
                            }
                          </span>

                        )}

                      </div>

                      <div className="opciones-producto">

                        {coloresDisponibles.map(
                          color => (

                            <button
                              key={color}
                              className={
                                colorSeleccionado ===
                                color
                                  ? 'opcion-producto seleccionada'
                                  : 'opcion-producto'
                              }
                              onClick={() =>
                                seleccionarColor(
                                  color
                                )
                              }
                            >
                              {color}
                            </button>

                          )
                        )}

                      </div>

                    </div>

                  )}

                {/* =================================================
                    STOCK
                ================================================= */}

                <div className="producto-stock">

                  <span className="stock-punto"></span>

                  {productoSeleccionado.stock > 0
                    ? 'Stock disponible'
                    : 'Sin stock'}

                </div>

              </div>

              {/* =================================================
                  BOTÓN CARRITO
              ================================================= */}

              <div className="producto-footer">

                <button
                  className="producto-boton-carrito"
                  disabled={
                    productoSeleccionado.stock <= 0
                  }
                  onClick={() => {

                    // ---------------------------------------------
                    // VERIFICAR TALLE
                    // ---------------------------------------------

                    if (
                      productoSeleccionado.tiene_talle &&
                      !talleSeleccionado
                    ) {

                      alert(
                        'Seleccioná un talle.'
                      )

                      return
                    }

                    // ---------------------------------------------
                    // VERIFICAR COLOR
                    // ---------------------------------------------

                    if (
                      productoSeleccionado.tiene_talle &&
                      variantes.length > 0 &&
                      coloresDisponibles.length > 0 &&
                      !colorSeleccionado
                    ) {

                      alert(
                        'Seleccioná un color.'
                      )

                      return
                    }

                    // ---------------------------------------------
                    // VARIANTE EXACTA
                    // ---------------------------------------------

                    const varianteSeleccionada =
                      obtenerVarianteSeleccionada()

                    // ---------------------------------------------
                    // PRECIO
                    // ---------------------------------------------

                    const precioSeleccionado =
                      varianteSeleccionada
                        ? Number(
                            varianteSeleccionada.precio ||
                              0
                          )
                        : obtenerPrecioActual()

                    // ---------------------------------------------
                    // IMAGEN
                    // ---------------------------------------------

                    const imagenCarrito =
                      imagenesProducto[0] ||
                      imagenesPortada[
                        productoSeleccionado.id
                      ] ||
                      productoSeleccionado.image ||
                      ''

                    // ---------------------------------------------
                    // AGREGAR
                    // ---------------------------------------------

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

                      // MUY IMPORTANTE:
                      // se guarda el precio de la variante
                      price:
                        precioSeleccionado,

                      variante_id:
                        varianteSeleccionada?.id ||
                        null
                    })

                    cerrarProducto()

                  }}
                >

                  {productoSeleccionado.stock > 0
                    ? 'Agregar al carrito'
                    : 'Sin stock'}

                </button>

              </div>

            </div>

          </div>

        </>

      )}

      <Footer />

    </div>
  )
}

export default App