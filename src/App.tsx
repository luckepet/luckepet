import './App.css'
import Header from './components/header'
import Navbar from './components/navbar'
import Footer from './components/footer'
import { useEffect, useState } from 'react'
import { supabase } from "./lib/supabase"

function App() {
  const [productos, setProductos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<any[]>([])
  const [mostrarCarrito, setMostrarCarrito] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("Todos")

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    const { data, error } = await supabase
      .from('Productos')
      .select('*')

    console.log("DATOS SUPABASE:", data)
    console.log("ERROR:", error)

    if (error) {
      console.log(error)
    } else {
      setProductos(data || [])
    }
  }

  /* =========================
     CARRITO
  ========================= */

  const agregarAlCarrito = (producto: any) => {
    setCarrito((carritoActual) => {

      const existe = carritoActual.some(
        item => item.id === producto.id
      )

      if (existe) {
        return carritoActual.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: (item.cantidad || 1) + 1 }
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
    })
  }

  const quitarDelCarrito = (id: any) => {
    setCarrito((carritoActual) =>
      carritoActual
        .map(item =>
          item.id === id
            ? {
                ...item,
                cantidad: (item.cantidad || 1) - 1
              }
            : item
        )
        .filter(item => item.cantidad > 0)
    )
  }

  const eliminarDelCarrito = (id: any) => {
    setCarrito((carritoActual) =>
      carritoActual.filter(item => item.id !== id)
    )
  }

  const cantidadCarrito = carrito.reduce(
    (total, producto) =>
      total + (producto.cantidad || 1),
    0
  )

  const totalCarrito = carrito.reduce(
    (total, producto) =>
      total +
      Number(producto.price || 0) *
      (producto.cantidad || 1),
    0
  )
 const comprarPorWhatsApp = () => {

  if (carrito.length === 0) return

  let mensaje = `Hola LuckePet, quiero realizar el siguiente pedido:\n\n`

  mensaje += `PRODUCTOS\n\n`

  carrito.forEach((producto, index) => {

    const cantidad = producto.cantidad || 1
    const precio = Number(producto.price || 0)
    const subtotal = precio * cantidad

    mensaje += `${index + 1}. ${producto.name}\n`
    mensaje += `Cantidad: ${cantidad}\n`
    mensaje += `Precio unitario: $${precio.toLocaleString('es-AR')}\n`
    mensaje += `Subtotal: $${subtotal.toLocaleString('es-AR')}\n\n`
  })

  mensaje += `----------------------------\n\n`
  mensaje += `TOTAL: $${totalCarrito.toLocaleString('es-AR')}\n\n`
  mensaje += `Gracias.`

  const numero = "5492664015639"

  const url =
    `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

  window.open(url, "_blank")
  setCarrito([])
setMostrarCarrito(false)
}

  /* =========================
     FILTROS
  ========================= */

  const productosFiltrados = productos
    .filter((producto) =>
      producto.name?.toLowerCase().includes(
        busqueda.toLowerCase()
      )
    )
    .filter(
      (producto) =>
        categoriaSeleccionada === "Todos" ||
        producto.category === categoriaSeleccionada
    )

  return (
    <div className="app">

      <Header
        setMostrarCarrito={setMostrarCarrito}
        cantidadCarrito={cantidadCarrito}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
      />

      <Navbar
        categoriaSeleccionada={categoriaSeleccionada}
        setCategoriaSeleccionada={setCategoriaSeleccionada}
      />

      {/* =========================
          CARRITO
      ========================= */}

      {mostrarCarrito && (
        <div className="carrito-lateral">

          <div className="carrito-header">

            <h2>🛒 Mi carrito</h2>

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

            <p>Tu carrito está vacío</p>

          ) : (

            <>
              {carrito.map((producto) => (

                <div
                  className="item-carrito"
                  key={producto.id}
                >

                  <img
                    src={producto.image}
                    alt={producto.name}
                  />

                  <div className="info-carrito">

                    <h4>{producto.name}</h4>

                    <p>
                      ${producto.price}
                    </p>

                    <div className="cantidad-carrito">

                      <button
                        onClick={() =>
                          quitarDelCarrito(
                            producto.id
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
                          producto.id
                        )
                      }
                    >
                      Eliminar
                    </button>

                  </div>

                </div>

              ))}

              {/* TOTAL */}

              <div className="total-carrito">

                <div>
                  <span>Total</span>

                  <strong>
                    ${totalCarrito.toLocaleString('es-AR')}
                  </strong>
                </div>

             <button
  className="boton-comprar"
  onClick={comprarPorWhatsApp}
>
  Comprar por WhatsApp
</button>

              </div>

            </>

          )}

        </div>
      )}

      {/* =========================
          PRODUCTOS
      ========================= */}

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

            productosFiltrados.map((producto) => (

              <div
                className="tarjeta"
                key={producto.id}
              >

                <div className="imagen-producto">

                  <img
                    src={producto.image}
                    alt={producto.name}
                  />

                </div>

                <div className="info-producto">

                  <h3>
                    {producto.name}
                  </h3>

                  <div className="precio-carrito">

                    <strong className="precio">
                      ${producto.price}
                    </strong>

                    <button
                      className="boton-agregar"
                      onClick={(e) => {

                        e.stopPropagation()

                        agregarAlCarrito(
                          producto
                        )

                      }}
                    >
                      +
                    </button>

                  </div>

                </div>

              </div>

            ))

          )}

        </div>

      </section>

      {/* =========================
          PROMOCIONES
      ========================= */}

      <main>

       

      </main>

      <Footer />

    </div>
  )
}

export default App