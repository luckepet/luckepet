import hero from '../assets/hero.avif'
import logo from '../assets/logo.png.jpeg'
function Header() {
  return (
    <header className="hero">
      <div className="topbar">
        <img src={logo} alt="LuckePet" className="logo-img" />

        <input
          type="text"
          placeholder="Buscar productos..."
        />

        <button>🛒</button>
        <button>👤</button>
      </div>
     <nav className="categorias">
  <div className="menu">
    <button>🐶 Perros</button>
    <div className="submenu">
      <a href="#">Alimentos</a>
      <a href="#">Juguetes</a>
      <a href="#">Correas</a>
      <a href="#">Camas</a>
    </div>
  </div>

  <div className="menu">
    <button>🐱 Gatos</button>
    <div className="submenu">
      <a href="#">Alimentos</a>
      <a href="#">Piedras sanitarias</a>
      <a href="#">Rascadores</a>
      <a href="#">Juguetes</a>
    </div>
  </div>

  <div className="menu">
    <button>🐦 Aves</button>
    <div className="submenu">
      <a href="#">Alimentos</a>
      <a href="#">Jaulas</a>
      <a href="#">Accesorios</a>
    </div>
  </div>

  <div className="menu">
    <button>🐹 Roedores</button>
    <div className="submenu">
      <a href="#">Alimentos</a>
      <a href="#">Jaulas</a>
      <a href="#">Viruta</a>
    </div>
  </div>

  <div className="menu">
    <button>🐠 Peces</button>
    <div className="submenu">
      <a href="#">Alimentos</a>
      <a href="#">Acuarios</a>
      <a href="#">Filtros</a>
    </div>
  </div>

  <div className="menu">
    <button>💊 Farmacia</button>
    <div className="submenu">
      <a href="#">Antiparasitarios</a>
      <a href="#">Vitaminas</a>
      <a href="#">Shampoo</a>
    </div>
  </div>

  <div className="menu">
    <button>🎁 Ofertas</button>
    <div className="submenu">
      <a href="#">Ver todas</a>
    </div>
  </div>
</nav>
<div className="hero-texto">
  <h2>🐾 Todo lo que tu mascota necesita, en un solo lugar</h2>

  <p>
    Alimentos, juguetes, higiene, correas y mucho más con envíos a todo el país.
  </p>

  <img src={hero} alt="LuckePet" className="hero-img" />

  <button className="comprar">
    🛒 Comprar ahora
  </button>
</div>


    </header>
  )
}

export default Header
