type Props = {
  nombre: string
  descripcion: string
  precio: number
  imagen: string
  agregarAlCarrito: () => void
}

function ProductoCard({
  nombre,
  descripcion,
  precio,
  imagen,
  agregarAlCarrito,
}: Props) {
  return (
    <div className="tarjeta">
      <img src={imagen} alt={nombre} />

      <h3>{nombre}</h3>

      <p>{descripcion}</p>

      <strong>${precio}</strong>

      <button onClick={agregarAlCarrito}>
        Agregar al carrito
      </button>
    </div>
  )
}

export default ProductoCard