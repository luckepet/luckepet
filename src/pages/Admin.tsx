import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Producto = {
  id: number;
  created_at?: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string | null;
  stock: number;
};

const productoVacio = {
  name: "",
  description: "",
  price: 0,
  image: "",
  category: "",
  stock: 0,
};

function Admin() {
  console.log("NUEVO ADMIN CARGADO");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sesion, setSesion] = useState<any>(null);
const [cargandoSesion, setCargandoSesion] = useState(true);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState(productoVacio);

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  useEffect(() => {
  async function verificarSesion() {
    const { data } = await supabase.auth.getSession();

    setSesion(data.session);
    setCargandoSesion(false);
  }

  verificarSesion();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSesion(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
async function iniciarSesion() {
  if (!email.trim() || !password) {
    alert("Ingresá email y contraseña.");
    return;
  }

  setIniciandoSesion(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    console.error("ERROR AL INICIAR SESIÓN:", error);
    alert("Email o contraseña incorrectos.");
    setIniciandoSesion(false);
    return;
  }

  setSesion(data.session);
  setPassword("");
  setIniciandoSesion(false);
}

async function cerrarSesion() {
  await supabase.auth.signOut();
  setSesion(null);
}
  // =========================
  // CARGAR PRODUCTOS
  // =========================

  async function cargarProductos() {
    setCargando(true);

    const { data, error } = await supabase
      .from("Productos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("ERROR AL CARGAR PRODUCTOS:", error);
      alert("No se pudieron cargar los productos.");
      setCargando(false);
      return;
    }

    setProductos((data || []) as Producto[]);
    setCargando(false);
  }

  // =========================
  // BUSCADOR
  // =========================

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return productos;

    return productos.filter((producto) =>
      [
        producto.name,
        producto.description,
        producto.category,
      ]
        .filter(Boolean)
        .some((valor) =>
          String(valor).toLowerCase().includes(texto)
        )
    );
  }, [productos, busqueda]);
  async function subirImagen(file: File) {
  setSubiendoImagen(true);

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const nombreArchivo = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from("PRODUCTOS")
    .upload(nombreArchivo, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("ERROR AL SUBIR IMAGEN:", error);
    alert("No se pudo subir la imagen.");
    setSubiendoImagen(false);
    return null;
  }

  const { data } = supabase.storage
    .from("PRODUCTOS")
    .getPublicUrl(nombreArchivo);

  setSubiendoImagen(false);

  return data.publicUrl;
}

  // =========================
  // CREAR PRODUCTO
  // =========================

  async function crearProducto() {
    if (!nuevoProducto.name.trim()) {
      alert("El producto necesita un nombre.");
      return;
    }

    if (nuevoProducto.price < 0) {
      alert("El precio no puede ser negativo.");
      return;
    }

    if (nuevoProducto.stock < 0) {
      alert("El stock no puede ser negativo.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("Productos")
      .insert([
        {
          name: nuevoProducto.name.trim(),
          description: nuevoProducto.description.trim(),
          price: Number(nuevoProducto.price),
          image: nuevoProducto.image.trim(),
          category: nuevoProducto.category.trim(),
          stock: Number(nuevoProducto.stock),
        },
      ]);

    if (error) {
      console.error("ERROR AL CREAR:", error);
      alert("No se pudo crear el producto.");
      setGuardando(false);
      return;
    }

    alert("Producto creado correctamente ✅");

    setNuevoProducto(productoVacio);
    setMostrarNuevo(false);
    setGuardando(false);

    await cargarProductos();
  }

  // =========================
  // EDITAR PRODUCTO
  // =========================

  async function guardarCambios() {
    if (!editando) return;

    if (!editando.name.trim()) {
      alert("El producto necesita un nombre.");
      return;
    }

    if (editando.price < 0) {
      alert("El precio no puede ser negativo.");
      return;
    }

    if (editando.stock < 0) {
      alert("El stock no puede ser negativo.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("Productos")
      .update({
        name: editando.name.trim(),
        description: editando.description?.trim() || "",
        price: Number(editando.price),
        image: editando.image?.trim() || "",
        category: editando.category?.trim() || "",
        stock: Number(editando.stock),
      })
      .eq("id", editando.id);

    if (error) {
      console.error("ERROR AL ACTUALIZAR:", error);
      alert("No se pudo guardar el producto.");
      setGuardando(false);
      return;
    }

    alert("Producto actualizado correctamente ✅");

    setEditando(null);
    setGuardando(false);

    await cargarProductos();
  }

  // =========================
  // ELIMINAR PRODUCTO
  // =========================

  async function eliminarProducto(id: number) {
    const confirmar = window.confirm(
      "¿Seguro que querés eliminar este producto?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("Productos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("ERROR AL ELIMINAR:", error);
      alert("No se pudo eliminar el producto.");
      return;
    }

    alert("Producto eliminado 🗑️");

    await cargarProductos();
  }

  // =========================
  // FORMATO PRECIO
  // =========================

  function formatoPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR").format(precio);
  }

  // =========================
  // INTERFAZ
  // =========================

  if (cargandoSesion) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Verificando acceso...
    </div>
  );
}

if (!sesion) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          width: "100%",
          maxWidth: "400px",
          padding: "35px",
          borderRadius: "20px",
          boxShadow: "0 3px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          LuckePet 🐾
        </h1>

        <p style={{ color: "#777" }}>
          Panel de administración
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") iniciarSesion();
          }}
          style={inputStyle}
        />

        <button
          onClick={iniciarSesion}
          disabled={iniciandoSesion}
          style={{
            ...primaryButton,
            width: "100%",
            marginTop: "5px",
          }}
        >
          {iniciandoSesion
            ? "Ingresando..."
            : "🔐 Iniciar sesión"}
        </button>
      </div>
    </div>
  );
}
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f3",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "25px",
            marginBottom: "25px",
            boxShadow: "0 3px 15px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                }}
              >
                LuckePet 🐾
              </h1>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777",
                }}
              >
                Panel de administración
              </p>
            </div>

            <button
              onClick={() => {
                setMostrarNuevo(!mostrarNuevo);
                setEditando(null);
              }}
              style={{
                background: "#263d2d",
                color: "white",
                border: "none",
                padding: "13px 20px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {mostrarNuevo ? "✕ Cerrar" : "＋ Nuevo producto"}
            </button>
            <button
  onClick={cerrarSesion}
  style={{
    background: "#eee",
    color: "#333",
    border: "none",
    padding: "13px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  }}
>
  🔒 Cerrar sesión
</button>
          </div>
        </div>

        {/* ESTADÍSTICAS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "15px",
              boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
            }}
          >
            <small style={{ color: "#777" }}>Productos</small>
            <h2 style={{ margin: "5px 0 0" }}>
              {productos.length}
            </h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "15px",
              boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
            }}
          >
            <small style={{ color: "#777" }}>Unidades en stock</small>
            <h2 style={{ margin: "5px 0 0" }}>
              {productos.reduce(
                (total, producto) =>
                  total + Number(producto.stock || 0),
                0
              )}
            </h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "15px",
              boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
            }}
          >
            <small style={{ color: "#777" }}>Sin stock</small>
            <h2 style={{ margin: "5px 0 0" }}>
              {
                productos.filter(
                  (producto) =>
                    Number(producto.stock || 0) <= 0
                ).length
              }
            </h2>
          </div>
        </div>

        {/* NUEVO PRODUCTO */}

        {mostrarNuevo && (
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "18px",
              marginBottom: "25px",
              boxShadow: "0 3px 15px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              ➕ Agregar producto
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "15px",
              }}
            >
              <div>
                <label>Nombre</label>
                <input
                  value={nuevoProducto.name}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ej: Correa para perro"
                  style={inputStyle}
                />
              </div>

              <div>
                <label>Categoría</label>
                <input
                  value={nuevoProducto.category}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      category: e.target.value,
                    })
                  }
                  placeholder="Ej: Accesorios"
                  style={inputStyle}
                />
              </div>

              <div>
                <label>Precio</label>
                <input
                  type="number"
                  min="0"
                  value={nuevoProducto.price}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      price: Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label>Stock</label>
                <input
                  type="number"
                  min="0"
                  value={nuevoProducto.stock}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      stock: Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>Descripción</label>
                <textarea
                  value={nuevoProducto.description}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descripción del producto"
                  style={{
                    ...inputStyle,
                    minHeight: "90px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ gridColumn: "1 / -1" }}>
  <label>Imagen del producto</label>

  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0];

      if (!file) return;

      const url = await subirImagen(file);

      if (url) {
        setNuevoProducto({
          ...nuevoProducto,
          image: url,
        });
      }
    }}
    style={inputStyle}
  />

  {subiendoImagen && (
    <p style={{ color: "#777" }}>
      Subiendo imagen...
    </p>
  )}
</div>
                <input
                  value={nuevoProducto.image}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      image: e.target.value,
                    })
                  }
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>
            </div>

            {nuevoProducto.image && (
              <img
                src={nuevoProducto.image}
                alt="Vista previa"
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginTop: "15px",
                }}
              />
            )}

            <div style={{ marginTop: "20px" }}>
              <button
                onClick={crearProducto}
                disabled={guardando}
                style={primaryButton}
              >
                {guardando ? "Guardando..." : "💾 Crear producto"}
              </button>
            </div>
          </div>
        )}

        {/* BUSCADOR */}

        <div
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "15px",
            marginBottom: "20px",
          }}
        >
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar producto..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 15px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              fontSize: "15px",
              outline: "none",
            }}
          />
        </div>

        {/* PRODUCTOS */}

        {cargando ? (
          <div
            style={{
              background: "white",
              padding: "40px",
              textAlign: "center",
              borderRadius: "15px",
            }}
          >
            Cargando productos...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div
            style={{
              background: "white",
              padding: "40px",
              textAlign: "center",
              borderRadius: "15px",
            }}
          >
            No encontramos productos.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {productosFiltrados.map((producto) => (
              <div
                key={producto.id}
                style={{
                  background: "white",
                  borderRadius: "18px",
                  overflow: "hidden",
                  boxShadow: "0 3px 15px rgba(0,0,0,0.06)",
                }}
              >
                {/* IMAGEN */}

                {producto.image ? (
                  <img
                    src={producto.image}
                    alt={producto.name}
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "220px",
                      background: "#eeeeee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    Sin imagen
                  </div>
                )}

                <div style={{ padding: "20px" }}>
                  {editando?.id === producto.id ? (
                    <>
                      <h3>Editar producto</h3>

                      <input
                        value={editando.name}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            name: e.target.value,
                          })
                        }
                        placeholder="Nombre"
                        style={inputStyle}
                      />

                      <input
                        value={editando.category || ""}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            category: e.target.value,
                          })
                        }
                        placeholder="Categoría"
                        style={inputStyle}
                      />

                      <textarea
                        value={editando.description || ""}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            description: e.target.value,
                          })
                        }
                        placeholder="Descripción"
                        style={{
                          ...inputStyle,
                          minHeight: "80px",
                          resize: "vertical",
                        }}
                      />

                      <input
                        type="number"
                        min="0"
                        value={editando.price}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            price: Number(e.target.value),
                          })
                        }
                        placeholder="Precio"
                        style={inputStyle}
                      />

                      <input
                        type="number"
                        min="0"
                        value={editando.stock}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            stock: Number(e.target.value),
                          })
                        }
                        placeholder="Stock"
                        style={inputStyle}
                      />

                      <input
                        value={editando.image || ""}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            image: e.target.value,
                          })
                        }
                        placeholder="URL de imagen"
                        style={inputStyle}
                      />

                      <button
                        onClick={guardarCambios}
                        disabled={guardando}
                        style={primaryButton}
                      >
                        {guardando
                          ? "Guardando..."
                          : "💾 Guardar cambios"}
                      </button>

                      <button
                        onClick={() => setEditando(null)}
                        style={secondaryButton}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <h3
                        style={{
                          margin: "0 0 8px",
                          fontSize: "19px",
                        }}
                      >
                        {producto.name}
                      </h3>

                      {producto.category && (
                        <span
                          style={{
                            display: "inline-block",
                            background: "#edf2ed",
                            padding: "5px 9px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            marginBottom: "10px",
                          }}
                        >
                          {producto.category}
                        </span>
                      )}

                      <p
                        style={{
                          color: "#666",
                          minHeight: "40px",
                        }}
                      >
                        {producto.description ||
                          "Sin descripción"}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "18px",
                        }}
                      >
                        <strong style={{ fontSize: "20px" }}>
                          ${formatoPrecio(Number(producto.price))}
                        </strong>

                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          Stock: {producto.stock || 0}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => {
                            setEditando({ ...producto });
                            setMostrarNuevo(false);
                          }}
                          style={{
                            ...secondaryButton,
                            flex: 1,
                          }}
                        >
                          ✏️ Editar
                        </button>

                        <button
                          onClick={() =>
                            eliminarProducto(producto.id)
                          }
                          style={{
                            ...deleteButton,
                            flex: 1,
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================
// ESTILOS
// =========================

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  marginTop: "6px",
  marginBottom: "12px",
  border: "1px solid #ddd",
  borderRadius: "9px",
  fontSize: "14px",
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  background: "#263d2d",
  color: "#fff",
  border: "none",
  padding: "11px 16px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: React.CSSProperties = {
  background: "#eee",
  color: "#333",
  border: "none",
  padding: "11px 16px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
  marginLeft: "8px",
};

const deleteButton: React.CSSProperties = {
  background: "#f3dddd",
  color: "#9b2929",
  border: "none",
  padding: "11px 16px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default Admin;