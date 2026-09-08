type Seccion = {
  id: number
  nombre: string
  orden: number
  activa: boolean
}

type NavbarProps = {
  secciones: Seccion[]
  categoriaSeleccionada: string
  setCategoriaSeleccionada: (
    categoria: string
  ) => void
}

function Navbar({
  secciones,
  categoriaSeleccionada,
  setCategoriaSeleccionada
}: NavbarProps) {

  return (
    <nav className="categorias">

      <button
        className={
          categoriaSeleccionada === 'Todos'
            ? 'categoria-activa'
            : ''
        }
        onClick={() =>
          setCategoriaSeleccionada('Todos')
        }
      >
        Todos
      </button>

      {secciones
        .filter(seccion => seccion.activa)
        .sort(
          (a, b) =>
            a.orden - b.orden
        )
        .map(seccion => (
          <button
            key={seccion.id}
            className={
              categoriaSeleccionada ===
              seccion.nombre
                ? 'categoria-activa'
                : ''
            }
            onClick={() =>
              setCategoriaSeleccionada(
                seccion.nombre
              )
            }
          >
            {seccion.nombre}
          </button>
        ))}

    </nav>
  )
}

export default Navbar