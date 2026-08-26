type NavbarProps = {
  categoriaSeleccionada: string
  setCategoriaSeleccionada: (categoria: string) => void
}

function Navbar({
  categoriaSeleccionada,
  setCategoriaSeleccionada
}: NavbarProps) {

  const categorias = [
    "Todos",
    "Perros",
    "Gatos",
    "Higiene",
    "Accesorios"
  ]

  return (
    <nav className="categorias">

      {categorias.map((categoria) => (
        <button
          key={categoria}
          className={
            categoriaSeleccionada === categoria
              ? "categoria-activa"
              : ""
          }
          onClick={() => setCategoriaSeleccionada(categoria)}
        >
          {categoria}
        </button>
      ))}

    </nav>
  )
}

export default Navbar