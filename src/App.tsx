import './App.css'

import Header from './components/header'
import Navbar from './components/navbar'
import Footer from './components/footer'

import { useEffect, useState } from 'react'
import type { TouchEvent, FormEvent } from 'react'

import { supabase } from './lib/supabase'

type Seccion = {
  id: number
  nombre: string
  orden: number
  activa: boolean
}

type Producto = {
  id: number
  name: string
  description: string | null
  price: number
  image: string | null
  category: string[] | string | null
  stock: number
  stock_reservado: number
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

type ItemCarrito = Producto & {
  cantidad: number
  talle: string | null
  color: string | null
  variante_id: number | null
  price: number
  image: string | null
}

// =====================================================
// WHATSAPP LUCKEPET
// =====================================================

const WHATSAPP_NUMERO = '5492664015639'

// =====================================================
// ESTADÍSTICAS
// =====================================================

const obtenerSessionId = () => {
  const clave = 'luckepet_session_id'

  let sessionId = localStorage.getItem(clave)

  if (!sessionId) {
    sessionId = crypto.randomUUID()

    localStorage.setItem(
      clave,
      sessionId
    )
  }

  return sessionId
}

const obtenerDispositivo = () => {
  return window.innerWidth <= 768
    ? 'Celular'
    : 'PC'
}

const registrarEvento = async (
  evento: string,
  producto?: Producto | null
) => {
  try {
    const sessionId = obtenerSessionId()
    const dispositivo = obtenerDispositivo()

    const { error } = await supabase
      .from('Visitas')
      .insert({
        session_id: sessionId,
        evento,
        producto_id: producto?.id || null,
        producto_nombre: producto?.name || null,
        dispositivo,
        fecha: new Date().toISOString()
      })

    if (error) {
      console.error(
        'ERROR REGISTRANDO ESTADÍSTICA:',
        error
      )
    }
  } catch (error) {
    console.error(
      'ERROR ESTADÍSTICAS:',
      error
    )
  }
}

function App() {
  const [productos, setProductos] =
    useState<Producto[]>([])

  const [secciones, setSecciones] =
    useState<Seccion[]>([])

  const [imagenesPortada, setImagenesPortada] =
    useState<Record<number, string>>({})

  const [carrito, setCarrito] =
    useState<ItemCarrito[]>([])

  const [mostrarCarrito, setMostrarCarrito] =
    useState(false)

  const [busqueda, setBusqueda] =
    useState('')

  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState('Todos')

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null)

  const [talleSeleccionado, setTalleSeleccionado] =
    useState('')

  const [colorSeleccionado, setColorSeleccionado] =
    useState('')

  const [variantes, setVariantes] =
    useState<Variante[]>([])

  const [imagenesProducto, setImagenesProducto] =
    useState<string[]>([])

  const [imagenesVariantes, setImagenesVariantes] =
    useState<Record<number, string[]>>({})

const [, setImagenesGenerales] =
  useState<string[]>([])
  const [fotoActual, setFotoActual] =
    useState(0)

  const [cargandoDetalle, setCargandoDetalle] =
    useState(false)

  const [imagenAmpliada, setImagenAmpliada] =
    useState(false)

  const [inicioToque, setInicioToque] =
    useState<number | null>(null)

  // =====================================================
  // CHECKOUT
  // =====================================================

  const [mostrarCheckout, setMostrarCheckout] =
    useState(false)

  const [enviandoPedido, setEnviandoPedido] =
    useState(false)

  const [pedidoCreado, setPedidoCreado] =
    useState(false)

  const [urlWhatsAppPedido, setUrlWhatsAppPedido] =
    useState('')

  const [emailEnviado, setEmailEnviado] =
    useState(false)

  const [errorPedido, setErrorPedido] =
    useState('')

  const [datosCliente, setDatosCliente] =
    useState({
      nombre: '',
      apellido: '',
      direccion: '',
      codigo_postal: '',
      telefono: '',
      email: ''
    })

  // =====================================================
  // REGISTRAR VISITA
  // =====================================================

  useEffect(() => {
    registrarEvento('visita')
  }, [])

  // =====================================================
  // NORMALIZAR URL
  // =====================================================

  const normalizarUrl = (valor: string) => {
    if (!valor) return ''

    try {
      const url = new URL(valor)

      return decodeURIComponent(
        url.pathname
      )
        .replace(
          '/storage/v1/object/public/',
          ''
        )
        .replace(
          '/storage/v1/object/sign/',
          ''
        )
        .replace(
          '/storage/v1/object/authenticated/',
          ''
        )
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .toLowerCase()
    } catch {
      return valor
        .split('?')[0]
        .split('#')[0]
        .trim()
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
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
  // STOCK DISPONIBLE
  // =====================================================

  const stockDisponible = (
    producto: Producto
  ) => {
    return Math.max(
      0,
      Number(producto.stock || 0) -
        Number(
          producto.stock_reservado || 0
        )
    )
  }

  // =====================================================
  // CARGA INICIAL
  // =====================================================

  useEffect(() => {
    cargarProductos()
    cargarSecciones()
  }, [])

  // =====================================================
  // VALIDAR SECCIÓN SELECCIONADA
  // =====================================================

  useEffect(() => {
    if (
      categoriaSeleccionada !== 'Todos' &&
      !secciones.some(
        seccion =>
          seccion.nombre ===
          categoriaSeleccionada
      )
    ) {
      setCategoriaSeleccionada('Todos')
    }
  }, [
    secciones,
    categoriaSeleccionada
  ])

  // =====================================================
  // CARGAR FOTOS DE PORTADA
  // =====================================================

  useEffect(() => {
    if (productos.length > 0) {
      cargarFotosPortada()
    }
  }, [productos])

  // =====================================================
  // HISTORIAL DEL NAVEGADOR
  // =====================================================

  useEffect(() => {
    if (
      !window.history.state?.luckepetBase
    ) {
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
        cerrarProductoSinHistorial()
      }
    }

    window.addEventListener(
      'popstate',
      manejarAtras
    )

    return () => {
      window.removeEventListener(
        'popstate',
        manejarAtras
      )
    }
  }, [productoSeleccionado])

  // =====================================================
  // LIMPIAR PRODUCTO
  // =====================================================

  const limpiarProductoSeleccionado = () => {
    setProductoSeleccionado(null)
    setTalleSeleccionado('')
    setColorSeleccionado('')
    setVariantes([])
    setImagenesVariantes({})
    setImagenesProducto([])
    setImagenesGenerales([])
    setFotoActual(0)
    setImagenAmpliada(false)
    setCargandoDetalle(false)
  }

  const cerrarProductoSinHistorial = () => {
    limpiarProductoSeleccionado()
  }

  // =====================================================
  // PRODUCTOS
  // =====================================================

  async function cargarProductos() {
    const {
      data,
      error
    } = await supabase
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

    setProductos(
      (data || []) as Producto[]
    )
  }

  // =====================================================
  // SECCIONES
  // =====================================================

  async function cargarSecciones() {
    const {
      data,
      error
    } = await supabase
      .from('Secciones')
      .select(
        'id, nombre, orden, activa'
      )
      .eq('activa', true)
      .order('orden', {
        ascending: true
      })

    if (error) {
      console.error(
        'ERROR SECCIONES:',
        error
      )

      setSecciones([])
      return
    }

    setSecciones(
      (data || []) as Seccion[]
    )
  }

  // =====================================================
  // FOTOS DE PORTADA
  // =====================================================

  async function cargarFotosPortada() {
    const mapa: Record<
      number,
      string
    > = {}

    const {
      data,
      error
    } = await supabase
      .from('ProductoImagenes')
      .select(
        'producto_id, image_url, orden'
      )
      .order('orden', {
        ascending: true
      })

    if (error) {
      console.error(
        'ERROR FOTOS PORTADA:',
        error
      )
    } else {
      ;(data || []).forEach(
        (imagen: Imagen) => {
          if (
            imagen.producto_id &&
            imagen.image_url?.trim() &&
            !mapa[
              imagen.producto_id
            ]
          ) {
            mapa[
              imagen.producto_id
            ] =
              imagen.image_url.trim()
          }
        }
      )
    }

    productos.forEach(
      producto => {
        if (
          !mapa[producto.id] &&
          producto.image?.trim()
        ) {
          mapa[producto.id] =
            producto.image.trim()
        }
      }
    )

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
      fotos.push(
        producto.image.trim()
      )
    }

    const {
      data,
      error
    } = await supabase
      .from('ProductoImagenes')
      .select(
        'image_url, orden'
      )
      .eq(
        'producto_id',
        producto.id
      )
      .order('orden', {
        ascending: true
      })

    if (error) {
      console.error(
        'ERROR IMAGENES GENERALES:',
        error
      )
    } else {
      ;(data || []).forEach(
        (imagen: Imagen) => {
          if (
            imagen.image_url?.trim()
          ) {
            fotos.push(
              imagen.image_url.trim()
            )
          }
        }
      )
    }

    return fotosUnicas(fotos)
  }

  // =====================================================
  // CARGAR VARIANTES
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
      .eq(
        'producto_id',
        productoId
      )
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

      return {
        variantes: [] as Variante[],
        mapa: {} as Record<
          number,
          string[]
        >
      }
    }

    const variantesCargadas =
      (data || []).map(
        variante => ({
          ...variante,
          talle:
            variante.talle || '',
          color:
            variante.color || '',
          precio:
            Number(
              variante.precio || 0
            )
        })
      ) as Variante[]

    setVariantes(
      variantesCargadas
    )

    if (
      variantesCargadas.length === 0
    ) {
      setImagenesVariantes({})

      return {
        variantes:
          variantesCargadas,
        mapa: {} as Record<
          number,
          string[]
        >
      }
    }

    const ids =
      variantesCargadas.map(
        variante =>
          variante.id
      )

    const {
      data: imagenes,
      error: errorImagenes
    } = await supabase
      .from(
        'ProductoVarianteImagenes'
      )
      .select(
        'variante_id, image_url, orden'
      )
      .in(
        'variante_id',
        ids
      )
      .order('orden', {
        ascending: true
      })

    if (errorImagenes) {
      console.error(
        'ERROR IMAGENES VARIANTES:',
        errorImagenes
      )

      setImagenesVariantes({})

      return {
        variantes:
          variantesCargadas,
        mapa: {} as Record<
          number,
          string[]
        >
      }
    }

    const mapa: Record<
      number,
      string[]
    > = {}

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
            !mapa[
              imagen.variante_id
            ]
          ) {
            mapa[
              imagen.variante_id
            ] = []
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
        const varianteId =
          Number(id)

        mapa[varianteId] =
          fotosUnicas(
            mapa[varianteId]
          )
      }
    )

    setImagenesVariantes(
      mapa
    )

    return {
      variantes:
        variantesCargadas,
      mapa
    }
  }

  // =====================================================
  // ABRIR PRODUCTO
  // =====================================================

  const abrirProducto = async (
    producto: Producto
  ) => {
    registrarEvento(
      'producto_visto',
      producto
    )

    window.history.pushState(
      {
        luckepetProducto: true,
        productoId: producto.id
      },
      '',
      window.location.href
    )

    setProductoSeleccionado(
      producto
    )

    setTalleSeleccionado('')
    setColorSeleccionado('')
    setVariantes([])
    setImagenesVariantes({})
    setImagenesProducto([])
    setImagenesGenerales([])
    setFotoActual(0)
    setImagenAmpliada(false)
    setCargandoDetalle(true)

    try {
      // -----------------------------------------------
      // 1. CARGAR FOTOS GENERALES
      // -----------------------------------------------

      const fotosGenerales =
        await cargarImagenesGenerales(
          producto
        )

      setImagenesGenerales(
        fotosGenerales
      )

      // -----------------------------------------------
      // 2. CARGAR VARIANTES Y SUS FOTOS
      // -----------------------------------------------

      const resultado =
        await cargarVariantes(
          producto.id
        )

      // -----------------------------------------------
      // 3. ARMAR GALERÍA COMPLETA
      //
      // IMPORTANTE:
      // Acá se cargan TODAS las imágenes una sola vez.
      // Después seleccionar talle/color NO modifica
      // esta galería.
      // -----------------------------------------------

      const fotosVariantes =
        Object.values(
          resultado.mapa
        ).flat()

      const galeriaCompleta =
        fotosUnicas([
          ...fotosGenerales,
          ...fotosVariantes
        ])

      setImagenesProducto(
        galeriaCompleta
      )

      setFotoActual(0)
    } catch (error) {
      console.error(
        'ERROR ABRIENDO PRODUCTO:',
        error
      )
    } finally {
      setCargandoDetalle(false)
    }
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

    limpiarProductoSeleccionado()
  }

  // =====================================================
  // TALLE
  // =====================================================

  const seleccionarTalle = (
    talle: string
  ) => {
    setTalleSeleccionado(
      talle
    )

    // Al cambiar talle reiniciamos color.
    setColorSeleccionado('')

    // Buscamos la primera variante de ese talle.
    // NO agregamos ni quitamos fotos.
    const variante =
      variantes.find(
        item =>
          item.talle === talle
      )

    if (!variante) {
      return
    }

    const fotosTalle =
      imagenesVariantes[
        variante.id
      ] || []

    // Buscamos esas fotos DENTRO de la galería
    // que ya fue cargada al abrir el producto.
    const indiceFoto =
      imagenesProducto.findIndex(
        foto =>
          fotosTalle.some(
            fotoVariante =>
              normalizarUrl(
                foto
              ) ===
              normalizarUrl(
                fotoVariante
              )
          )
      )

    if (indiceFoto >= 0) {
      setFotoActual(
        indiceFoto
      )
    }
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
          array.indexOf(
            color
          ) === index
      )

  // =====================================================
  // COLOR
  // =====================================================

  const seleccionarColor = (
    color: string
  ) => {
    setColorSeleccionado(
      color
    )

    const variante =
      variantes.find(
        item =>
          item.talle ===
            talleSeleccionado &&
          item.color === color
      )

    if (!variante) {
      return
    }

    const fotosColor =
      imagenesVariantes[
        variante.id
      ] || []

    // IMPORTANTE:
    // No modificamos imagenesProducto.
    // Solo buscamos la foto correspondiente
    // dentro de las fotos ya cargadas.
    const indiceFoto =
      imagenesProducto.findIndex(
        foto =>
          fotosColor.some(
            fotoVariante =>
              normalizarUrl(
                foto
              ) ===
              normalizarUrl(
                fotoVariante
              )
          )
      )

    if (indiceFoto >= 0) {
      setFotoActual(
        indiceFoto
      )
    }
  }

  // =====================================================
  // VARIANTE EXACTA
  // =====================================================

  const obtenerVarianteSeleccionada =
    () => {
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

  const obtenerPrecioActual =
    () => {
      if (
        !productoSeleccionado
      ) {
        return 0
      }

      if (
        variantes.length === 0
      ) {
        return Number(
          productoSeleccionado.price ||
            0
        )
      }

      const varianteExacta =
        obtenerVarianteSeleccionada()

      if (
        varianteExacta
      ) {
        return Number(
          varianteExacta.precio ||
            0
        )
      }

      if (
        talleSeleccionado
      ) {
        const variantesDelTalle =
          variantes.filter(
            variante =>
              variante.talle ===
              talleSeleccionado
          )

        if (
          variantesDelTalle.length >
          0
        ) {
          const precios =
            variantesDelTalle
              .map(
                variante =>
                  Number(
                    variante.precio ||
                      0
                  )
              )
              .filter(
                precio =>
                  precio > 0
              )

          if (
            precios.length > 0
          ) {
            return Math.min(
              ...precios
            )
          }
        }
      }

      return Number(
        productoSeleccionado.price ||
          0
      )
    }

  // =====================================================
  // CARRITO
  // =====================================================

  const agregarAlCarrito = (
    producto: ItemCarrito
  ) => {
    registrarEvento(
      'agregado_carrito',
      producto
    )

    setCarrito(
      carritoActual => {
        const cantidadActual =
          carritoActual
            .filter(
              item =>
                item.id ===
                  producto.id &&
                item.talle ===
                  producto.talle &&
                item.color ===
                  producto.color &&
                item.variante_id ===
                  producto.variante_id
            )
            .reduce(
              (
                total,
                item
              ) =>
                total +
                (item.cantidad ||
                  1),
              0
            )

        const productoActual =
          productos.find(
            item =>
              item.id ===
              producto.id
          )

        if (productoActual) {
          const disponible =
            stockDisponible(
              productoActual
            )

          if (
            cantidadActual >=
            disponible
          ) {
            return carritoActual
          }
        }

        const existe =
          carritoActual.some(
            item =>
              item.id ===
                producto.id &&
              item.talle ===
                producto.talle &&
              item.color ===
                producto.color &&
              item.variante_id ===
                producto.variante_id
          )

        if (existe) {
          return carritoActual.map(
            item =>
              item.id ===
                  producto.id &&
                item.talle ===
                  producto.talle &&
                item.color ===
                  producto.color &&
                item.variante_id ===
                  producto.variante_id
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

  // =====================================================
  // QUITAR DEL CARRITO
  // =====================================================

  const quitarDelCarrito = (
    id: number,
    talle: string | null,
    color: string | null,
    varianteId: number | null
  ) => {
    setCarrito(
      carritoActual =>
        carritoActual
          .map(item =>
            item.id === id &&
            item.talle === talle &&
            item.color === color &&
            item.variante_id ===
              varianteId
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

  // =====================================================
  // ELIMINAR DEL CARRITO
  // =====================================================

  const eliminarDelCarrito = (
    id: number,
    talle: string | null,
    color: string | null,
    varianteId: number | null
  ) => {
    setCarrito(
      carritoActual =>
        carritoActual.filter(
          item =>
            !(
              item.id === id &&
              item.talle === talle &&
              item.color === color &&
              item.variante_id ===
                varianteId
            )
        )
    )
  }

  // =====================================================
  // CANTIDAD CARRITO
  // =====================================================

  const cantidadCarrito =
    carrito.reduce(
      (
        total,
        producto
      ) =>
        total +
        (producto.cantidad ||
          1),
      0
    )

  // =====================================================
  // TOTAL CARRITO
  // =====================================================

  const totalCarrito =
    carrito.reduce(
      (
        total,
        producto
      ) =>
        total +
        Number(
          producto.price || 0
        ) *
          (producto.cantidad ||
            1),
      0
    )

  // =====================================================
  // ABRIR CHECKOUT
  // =====================================================

  const abrirCheckout = () => {
    if (!carrito.length) {
      return
    }

    registrarEvento(
      'checkout'
    )

    setErrorPedido('')
    setPedidoCreado(false)
    setUrlWhatsAppPedido('')
    setEmailEnviado(false)
    setMostrarCarrito(false)
    setMostrarCheckout(true)
  }

  // =====================================================
  // CERRAR CHECKOUT
  // =====================================================

  const cerrarCheckout = () => {
    if (enviandoPedido) {
      return
    }

    setMostrarCheckout(false)
    setPedidoCreado(false)
    setErrorPedido('')
  }

  // =====================================================
  // ENVIAR PEDIDO
  // =====================================================

  const enviarPedido = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    if (!carrito.length) {
      setErrorPedido(
        'Tu carrito está vacío.'
      )

      return
    }

    const campos =
      Object.values(datosCliente)

    if (
      campos.some(
        campo =>
          !campo.trim()
      )
    ) {
      setErrorPedido(
        'Completá todos los campos.'
      )

      return
    }

    setEnviandoPedido(true)
    setErrorPedido('')
    setEmailEnviado(false)

    try {
      // ============================================
      // VOLVER A CARGAR STOCK ACTUAL
      // ============================================

      const {
        data: productosActualizados,
        error: errorStock
      } = await supabase
        .from('Productos')
        .select('*')
        .in(
          'id',
          carrito.map(
            producto =>
              producto.id
          )
        )

      if (errorStock) {
        throw errorStock
      }

      const productosStock =
        (productosActualizados ||
          []) as Producto[]

      // ============================================
      // VERIFICAR STOCK
      // ============================================

      for (const producto of carrito) {
        const productoActual =
          productosStock.find(
            item =>
              item.id ===
              producto.id
          )

        if (!productoActual) {
          throw new Error(
            `El producto "${producto.name}" ya no está disponible.`
          )
        }

        const disponible =
          stockDisponible(
            productoActual
          )

        const cantidadSolicitada =
          producto.cantidad || 1

        if (
          disponible <
          cantidadSolicitada
        ) {
          throw new Error(
            `Stock insuficiente para "${producto.name}". Disponible: ${disponible}.`
          )
        }
      }

      // ============================================
      // ITEMS
      // ============================================

      const items = carrito.map(
        producto => {
          const cantidad =
            producto.cantidad || 1

          const precio =
            Number(
              producto.price || 0
            )

          return {
            producto_id:
              producto.id,

            nombre_producto:
              producto.name,

            talle:
              producto.talle || '',

            color:
              producto.color || '',

            variante_id:
              producto.variante_id
                ? String(
                    producto.variante_id
                  )
                : '',

            cantidad,

            precio_unitario:
              precio,

            imagen:
              producto.image ||
              imagenesPortada[
                producto.id
              ] ||
              ''
          }
        }
      )

      // ============================================
      // CREAR PEDIDO
      // ============================================

      const {
        data: pedidoId,
        error
      } = await supabase.rpc(
        'crear_pedido',
        {
          p_nombre:
            datosCliente.nombre.trim(),

          p_apellido:
            datosCliente.apellido.trim(),

          p_direccion:
            datosCliente.direccion.trim(),

          p_codigo_postal:
            datosCliente.codigo_postal.trim(),

          p_telefono:
            datosCliente.telefono.trim(),

          p_email:
            datosCliente.email.trim(),

          p_total:
            totalCarrito,

          p_items:
            items
        }
      )

      if (error) {
        console.error(
          'ERROR CREANDO PEDIDO:',
          error
        )

        throw error
      }

      console.log(
        'PEDIDO CREADO:',
        pedidoId
      )

      // ============================================
      // ESTADÍSTICA PEDIDO
      // ============================================

      registrarEvento(
        'pedido'
      )

      // ============================================
      // EMAIL
      // ============================================

      const {
        error: errorEmail
      } = await supabase.functions.invoke(
        'enviar-email-pedido',
        {
          body: {
            pedidoId
          }
        }
      )

      if (errorEmail) {
        console.error(
          'ERROR ENVIANDO EMAIL:',
          errorEmail
        )

        setEmailEnviado(false)
      } else {
        setEmailEnviado(true)
      }

      // ============================================
      // WHATSAPP
      // ============================================

      const numeroPedido =
        String(pedidoId)

      const nombreCompleto =
        `${datosCliente.nombre.trim()} ${datosCliente.apellido.trim()}`

      const totalPedido =
        totalCarrito.toLocaleString(
          'es-AR'
        )

      const mensajeWhatsApp =
        `Hola LuckePet 👋\n` +
        `Ya realicé mi compra.\n\n` +
        `N.º de pedido: #${numeroPedido}\n` +
        `Nombre: ${nombreCompleto}\n` +
        `Total: $${totalPedido}\n\n` +
        `Muchas gracias.`

      const urlWhatsApp =
        `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
          mensajeWhatsApp
        )}`

      setUrlWhatsAppPedido(
        urlWhatsApp
      )

      // ============================================
      // ÉXITO
      // ============================================

      setPedidoCreado(true)
      setCarrito([])
      setMostrarCarrito(false)

      await cargarProductos()

      setDatosCliente({
        nombre: '',
        apellido: '',
        direccion: '',
        codigo_postal: '',
        telefono: '',
        email: ''
      })
    } catch (error) {
      console.error(
        'ERROR CREANDO PEDIDO:',
        error
      )

      const mensaje =
        error instanceof Error
          ? error.message
          : ''

      if (
        mensaje
          .toLowerCase()
          .includes('stock')
      ) {
        setErrorPedido(
          'No hay stock suficiente para uno de los productos. Revisá tu carrito e intentá nuevamente.'
        )
      } else {
        setErrorPedido(
          'No pudimos registrar el pedido. Intentá nuevamente.'
        )
      }
    } finally {
      setEnviandoPedido(false)
    }
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
                ? [
                    producto.category
                  ]
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
      imagenesProducto.length <=
      1
    ) {
      return
    }

    setFotoActual(
      actual =>
        actual === 0
          ? imagenesProducto.length -
            1
          : actual - 1
    )
  }

  const fotoSiguiente = () => {
    if (
      imagenesProducto.length <=
      1
    ) {
      return
    }

    setFotoActual(
      actual =>
        actual ===
        imagenesProducto.length -
          1
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
      e.changedTouches[0]
        .clientX

    const diferencia =
      inicioToque - final

    if (
      Math.abs(diferencia) >=
      50
    ) {
      if (
        diferencia > 0
      ) {
        fotoSiguiente()
      } else {
        fotoAnterior()
      }
    }

    setInicioToque(null)
  }

  // =====================================================
  // RENDER
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
        busqueda={
          busqueda
        }
        setBusqueda={
          setBusqueda
        }
      />

      <Navbar
        secciones={secciones}
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
                setMostrarCarrito(
                  false
                )
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
                    key={`${producto.id}-${producto.talle || 'sin-talle'}-${producto.color || 'sin-color'}-${producto.variante_id || 'sin-variante'}`}
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
                              producto.color,
                              producto.variante_id
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
                            producto.color,
                            producto.variante_id
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
                    abrirCheckout
                  }
                >
                  Comprar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* =================================================
          CHECKOUT
      ================================================= */}

      {mostrarCheckout && (
        <div
          className="producto-overlay"
          onClick={e => {
            if (
              e.target ===
              e.currentTarget
            ) {
              cerrarCheckout()
            }
          }}
        >
          <div className="producto-detalle checkout-detalle">
            <div className="producto-detalle-header">
              <button
                className="producto-volver"
                onClick={
                  cerrarCheckout
                }
                disabled={
                  enviandoPedido
                }
              >
                ←
              </button>

              <span>
                Finalizar compra
              </span>

              <button
                className="producto-cerrar"
                onClick={
                  cerrarCheckout
                }
                disabled={
                  enviandoPedido
                }
              >
                ×
              </button>
            </div>

            {!pedidoCreado ? (
              <form
                className="checkout-form"
                onSubmit={
                  enviarPedido
                }
              >
                <h1>
                  Datos de entrega
                </h1>

                <p className="checkout-subtitulo">
                  Completá tus datos para
                  enviar el pedido.
                </p>

                <div className="checkout-resumen">
                  <strong>
                    Resumen del pedido
                  </strong>

                  {carrito.map(
                    producto => (
                      <div
                        className="checkout-item"
                        key={`${producto.id}-${producto.talle || 'sin-talle'}-${producto.color || 'sin-color'}-${producto.variante_id || 'sin-variante'}`}
                      >
                        <span>
                          {producto.name}
                          {' × '}
                          {
                            producto.cantidad
                          }

                          {producto.talle
                            ? ` · ${producto.talle}`
                            : ''}

                          {producto.color
                            ? ` · ${producto.color}`
                            : ''}
                        </span>

                        <strong>
                          $
                          {(
                            Number(
                              producto.price ||
                                0
                            ) *
                            (producto.cantidad ||
                              1)
                          ).toLocaleString(
                            'es-AR'
                          )}
                        </strong>
                      </div>
                    )
                  )}

                  <div className="checkout-total">
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
                </div>

                <div className="checkout-grid">
                  <label>
                    Nombre

                    <input
                      type="text"
                      value={
                        datosCliente.nombre
                      }
                      onChange={e =>
                        setDatosCliente(
                          actual => ({
                            ...actual,
                            nombre:
                              e.target.value
                          })
                        )
                      }
                      autoComplete="given-name"
                      required
                    />
                  </label>

                  <label>
                    Apellido

                    <input
                      type="text"
                      value={
                        datosCliente.apellido
                      }
                      onChange={e =>
                        setDatosCliente(
                          actual => ({
                            ...actual,
                            apellido:
                              e.target.value
                          })
                        )
                      }
                      autoComplete="family-name"
                      required
                    />
                  </label>

                  <label className="checkout-campo-completo">
                    Dirección

                    <input
                      type="text"
                      value={
                        datosCliente.direccion
                      }
                      onChange={e =>
                        setDatosCliente(
                          actual => ({
                            ...actual,
                            direccion:
                              e.target.value
                          })
                        )
                      }
                      autoComplete="street-address"
                      required
                    />
                  </label>

                  <label>
                    Código Postal

                    <input
                      type="text"
                      value={
                        datosCliente.codigo_postal
                      }
                      onChange={e =>
                        setDatosCliente(
                          actual => ({
                            ...actual,
                            codigo_postal:
                              e.target.value
                          })
                        )
                      }
                      autoComplete="postal-code"
                      required
                    />
                  </label>

                  <label>
                    Teléfono

                    <input
                      type="tel"
                      value={
                        datosCliente.telefono
                      }
                      onChange={e =>
                        setDatosCliente(
                          actual => ({
                            ...actual,
                            telefono:
                              e.target.value
                          })
                        )
                      }
                      autoComplete="tel"
                      required
                    />
                  </label>

                  <label className="checkout-campo-completo">
                    Email

                    <input
                      type="email"
                      value={
                        datosCliente.email
                      }
                      onChange={e =>
                        setDatosCliente(
                          actual => ({
                            ...actual,
                            email:
                              e.target.value
                          })
                        )
                      }
                      autoComplete="email"
                      required
                    />
                  </label>
                </div>

                {errorPedido && (
                  <div className="checkout-error">
                    {errorPedido}
                  </div>
                )}

                <button
                  type="submit"
                  className="producto-boton-carrito checkout-boton"
                  disabled={
                    enviandoPedido ||
                    carrito.length === 0
                  }
                >
                  {enviandoPedido
                    ? 'Enviando pedido...'
                    : 'Enviar pedido'}
                </button>
              </form>
            ) : (
              <div className="checkout-exito">
                <div className="checkout-exito-icono">
                  ✓
                </div>

                <h1>
                  ¡Gracias por tu compra!
                </h1>

                <p>
                  Recibimos tu pedido
                  correctamente.
                </p>

                <p>
                  Tu pedido quedó
                  pendiente de
                  confirmación.
                </p>

                {emailEnviado ? (
                  <p>
                    Te enviamos un email con
                    todos los detalles de tu
                    compra.
                  </p>
                ) : (
                  <p>
                    Podés continuar la
                    coordinación de tu compra
                    por WhatsApp.
                  </p>
                )}

                <p>
                  Para continuar con la
                  coordinación de tu
                  compra, escribinos por
                  WhatsApp.
                </p>

                {urlWhatsAppPedido && (
                  <button
                    type="button"
                    className="producto-boton-carrito"
                    onClick={() =>
                      window.open(
                        urlWhatsAppPedido,
                        '_blank'
                      )
                    }
                  >
                    Continuar por WhatsApp
                  </button>
                )}

                <button
                  type="button"
                  className="producto-boton-carrito"
                  onClick={
                    cerrarCheckout
                  }
                >
                  Seguir comprando
                </button>
              </div>
            )}
          </div>
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

                const disponible =
                  stockDisponible(
                    producto
                  )

                const sinStock =
                  disponible <= 0

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
                        <div
                          style={{
                            position:
                              'relative',
                            width:
                              '100%'
                          }}
                        >
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

                          {sinStock && (
                            <div
                              style={{
                                position:
                                  'absolute',
                                inset: 0,
                                background:
                                  'rgba(0, 0, 0, 0.58)',
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                color:
                                  'white',
                                fontSize:
                                  '20px',
                                fontWeight:
                                  'bold',
                                letterSpacing:
                                  '1px'
                              }}
                            >
                              SIN STOCK
                            </div>
                          )}
                        </div>
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
                          disabled={
                            sinStock
                          }
                          onClick={e => {
                            e.stopPropagation()

                            if (
                              sinStock
                            ) {
                              return
                            }

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
                              talle:
                                null,
                              color:
                                null,
                              image:
                                imagenPortada,
                              price:
                                Number(
                                  producto.price ||
                                    0
                                ),
                              variante_id:
                                null,
                              cantidad:
                                1
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
                  setImagenAmpliada(
                    false
                  )
                }
              >
                <button
                  className="imagen-ampliada-cerrar"
                  onClick={() =>
                    setImagenAmpliada(
                      false
                    )
                  }
                >
                  ×
                </button>

                {imagenesProducto.length >
                  1 && (
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

                {imagenesProducto.length >
                  1 && (
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

                {imagenesProducto.length >
                  1 && (
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
              DETALLE PRODUCTO
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

              {/* GALERÍA */}

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
                ) : imagenesProducto.length >
                  0 ? (
                  <img
                    src={
                      imagenesProducto[
                        fotoActual
                      ]
                    }
                    alt={
                      productoSeleccionado.name
                    }
                    className="producto-foto-principal"
                    width="800"
                    height="800"
                    onClick={e => {
                      e.stopPropagation()

                      setImagenAmpliada(
                        true
                      )
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
                        'zoom-in',
                      pointerEvents:
                        'auto'
                    }}
                  />
                ) : (
                  <div className="producto-sin-imagen">
                    Sin imagen
                  </div>
                )}

                {imagenesProducto.length >
                  1 && (
                  <>
                    <button
                      className="galeria-flecha galeria-anterior"
                      onClick={e => {
                        e.stopPropagation()
                        fotoAnterior()
                      }}
                    >
                      ‹
                    </button>

                    <button
                      className="galeria-flecha galeria-siguiente"
                      onClick={e => {
                        e.stopPropagation()
                        fotoSiguiente()
                      }}
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

              {/* MINIATURAS */}

              {imagenesProducto.length >
                1 && (
                <div className="producto-miniaturas">
                  {imagenesProducto.map(
                    (
                      imagen,
                      index
                    ) => (
                      <button
                        key={`${normalizarUrl(imagen)}-${index}`}
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
                          src={
                            imagen
                          }
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

              {/* INFORMACIÓN */}

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

                {/* TALLES */}

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
                            key={
                              talle
                            }
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
                            {
                              talle
                            }
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* COLORES */}

                {productoSeleccionado.tiene_talle &&
                  talleSeleccionado &&
                  coloresDisponibles.length >
                    0 && (
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
                              key={
                                color
                              }
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
                              {
                                color
                              }
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* STOCK */}

                <div className="producto-stock">
                  <span className="stock-punto"></span>

                  {stockDisponible(
                    productoSeleccionado
                  ) > 0
                    ? `Stock disponible: ${stockDisponible(
                        productoSeleccionado
                      )}`
                    : 'Sin stock'}
                </div>
              </div>

              {/* BOTÓN CARRITO */}

              <div className="producto-footer">
                <button
                  className="producto-boton-carrito"
                  disabled={
                    stockDisponible(
                      productoSeleccionado
                    ) <= 0
                  }
                  onClick={() => {
                    if (
                      stockDisponible(
                        productoSeleccionado
                      ) <= 0
                    ) {
                      alert(
                        'Este producto no tiene stock disponible.'
                      )

                      return
                    }

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
                      coloresDisponibles.length >
                        0 &&
                      !colorSeleccionado
                    ) {
                      alert(
                        'Seleccioná un color.'
                      )

                      return
                    }

                    const varianteSeleccionada =
                      obtenerVarianteSeleccionada()

                    const precioSeleccionado =
                      varianteSeleccionada
                        ? Number(
                            varianteSeleccionada.precio ||
                              0
                          )
                        : obtenerPrecioActual()

                    // La imagen que se guarda en el carrito
                    // es la que está mostrando actualmente.
                    const imagenCarrito =
                      imagenesProducto[
                        fotoActual
                      ] ||
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

                      price:
                        precioSeleccionado,

                      variante_id:
                        varianteSeleccionada?.id ||
                        null,

                      cantidad:
                        1
                    })

                    cerrarProducto()
                  }}
                >
                  {stockDisponible(
                    productoSeleccionado
                  ) > 0
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