import hero from '../assets/hero.avif'
import logo from '../assets/luckepetlogo.jpg'
import { ShoppingCart } from "lucide-react";
function Header({ 
  setMostrarCarrito, 
  cantidadCarrito,
  busqueda,
  setBusqueda
}: any) {
  return (
    <header className="hero">
      <div className="topbar">
        <img src={logo} alt="LuckePet" className="logo-img" />

       <input
  type="text"
  placeholder="Buscar productos..."
  value={busqueda}
  onChange={(e) => setBusqueda(e.target.value)}
/>

<button 
  className="boton-carrito"
  onClick={() => setMostrarCarrito(true)}
>
  <ShoppingCart size={28} strokeWidth={3} color="black" />
<span className="numero-carrito">{cantidadCarrito}</span>
      </button>

      </div>
  



    </header>
  )
}

export default Header
