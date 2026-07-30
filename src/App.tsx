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
 
const [carrito, setCarrito] = useState<string[]>([])
const [mostrarCarrito, setMostrarCarrito] = useState(false)
const [busqueda, setBusqueda] = useState("")
const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos")
  return (
    
    <div className="app">
      <Header />

      <Navbar />
     <div
  className="carrito"
  onClick={() => setMostrarCarrito(!mostrarCarrito)}
>
  🛒 Carrito: {carrito.length} productos
</div>
{mostrarCarrito && (
  <div className="carrito-menu">
    <h3>Mi carrito</h3>

    {carrito.length === 0 ? (
      <p>Tu carrito está vacío.</p>
    ) : (
      <ul>
        {carrito.map((producto, index) => (
          <li key={index}>{producto}</li>
        ))}
      </ul>
    )}
  </div>
)}
      <section className="productos">
  <h2>Productos destacados</h2>
<div className="categorias">
  <button onClick={() => setCategoriaSeleccionada("Todos")}>
    Todos
  </button>

  <button onClick={() => setCategoriaSeleccionada("Higiene")}>
    🧼 Higiene
  </button>

  <button onClick={() => setCategoriaSeleccionada("Accesorios")}>
    🧸 Accesorios
  </button>

  <button onClick={() => setCategoriaSeleccionada("Perros")}>
    🐶 Perros
  </button>

  <button onClick={() => setCategoriaSeleccionada("Gatos")}>
    🐱 Gatos
  </button>
</div>
  <div className="tarjetas">
  <h3>Productos cargados: {productos.length}</h3>
  <p>Cantidad: {productos.length}</p>
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
      <img src={producto.image} alt={producto.name} />

      <div className="info-producto">
        <h3>{producto.name}</h3>

        <p>{producto.description}</p>

        <strong className="precio">
          ${producto.price}
        </strong>

        <button
          onClick={() =>
            setCarrito([...carrito, producto.name])
          }
        >
          🛒 Agregar al carrito
        </button>
      </div>
    </div>
  ))}
  </div>
</section>
<main></main>
       <main>
        <h2>Bienvenidos a LuckePet 🐾</h2>

        <p>
          Encontrá productos de calidad para cuidar a quienes más querés.
        </p>

        <div className="productos">
          <div className="card">
            🦴
            <h3>Juguetes</h3>
            <p>Diversión para tu mascota.</p>
          </div>

          <div className="card">
            🥩
            <h3>Nutrición</h3>
            <p>Alimentos y bienestar.</p>
          </div>

          <div className="card">
            🧴
            <h3>Higiene</h3>
            <p>Cuidado todos los días.</p>
          </div>
        </div>

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
