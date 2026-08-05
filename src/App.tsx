import './App.css'
import Header from './components/header'
import Navbar from './components/navbar'
import Footer from './components/footer'
import { useEffect, useState } from 'react'
import { supabase } from "./lib/supabase";




function App() {
  const [productos, setProductos] = useState<any[]>([])
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
 
const [carrito, setCarrito] = useState<any[]>([])
const [mostrarCarrito, setMostrarCarrito] = useState(false)
const [busqueda, setBusqueda] = useState("");
const [categoriaSeleccionada] = useState("Todos")
const cantidadCarrito = carrito.length;
  return (

    <div className="app">
      <Header 
  setMostrarCarrito={setMostrarCarrito}
  cantidadCarrito={cantidadCarrito}
  busqueda={busqueda}
  setBusqueda={setBusqueda}
/>
      <Navbar />
     
{mostrarCarrito && (
  <div className="carrito-lateral">

    <h2>🛒 Mi carrito</h2>

<button 
  className="cerrar-carrito"
  onClick={() => setMostrarCarrito(false)}
>
  
</button>
   {carrito.length === 0 ? (
  <p>Tu carrito está vacío</p>
) : (
  carrito.map((producto, index) => (
    <div className="item-carrito" key={index}>
      <img src={producto.image} />

      <div>
        <h4>{producto.name}</h4>
        <p>${producto.price}</p>

        <button
          onClick={() =>
            setCarrito(carrito.filter((_, i) => i !== index))
          }
        >
          Eliminar
        </button>
      </div>
    </div>
 ))
)}

  </div>
)}

<section className="productos">

  <div className="tarjetas">
 
{productos
  .filter((producto) =>
    producto.name?.toLowerCase().includes(busqueda.toLowerCase())
  )
  .filter(
    (producto) =>
      categoriaSeleccionada === "Todos" ||
      producto.category === categoriaSeleccionada
  )
  .map((producto) => (
<div className="tarjeta" key={producto.id}>

  <div className="imagen-producto">
    <img src={producto.image} alt={producto.name} />


  </div>

  <div className="info-producto">
    <h3>{producto.name}</h3>


    <div className="precio-carrito">
  <strong className="precio">
    ${producto.price}
  </strong>

  <button
    className="boton-agregar"
    onClick={(e) => {
      e.stopPropagation()
      setCarrito([...carrito, producto])
    }}
  >
    +
  </button>
</div>
</div>
</div>
  ))}
  
  </div>
</section>
<main></main>
       <main>
        <section className="promociones">
          <div className="promo">
            <h3>🎉 ¡Envíos gratis desde $50.000!</h3>
            <p>
              Aprovechá nuestras promociones y encontrá todo lo que tu mascota necesita.
            </p>

            <button className="comprar">
              Ver ofertas
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App