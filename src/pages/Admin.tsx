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
  tiene_talle: boolean;
  talles: string[];
};

type ImagenProducto = {
  id?: number;
  producto_id: number;
  image_url: string;
  orden: number;
};
type Variante = {
  id?: number;
  producto_id: number;
  talle: string;
  color: string;
};

type ImagenVariante = {
  id?: number;
  variante_id: number;
  image_url: string;
  orden: number;
};

const productoVacio = {
  name: "",
  description: "",
  price: 0,
  image: "",
  category: "",
  stock: 0,
  tiene_talle: false,
  talles: [] as string[],
};

function Admin() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [imagenesProducto, setImagenesProducto] = useState<
    Record<number, ImagenProducto[]>
  >({});

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

  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState<File[]>(
    []
  );
  const [variantes, setVariantes] = useState<Variante[]>([]);
const [imagenesVariantes, setImagenesVariantes] = useState<
  Record<number, ImagenVariante[]>
>({});

const [nuevoColor, setNuevoColor] = useState("");
const [talleParaColor, setTalleParaColor] = useState("");
const [coloresPorTalle, setColoresPorTalle] = useState<
  Record<string, string[]>
>({});
const [fotosPorColor, setFotosPorColor] = useState<
  Record<string, File[]>
>({});
function seleccionarFotosColor(
  talle: string,
  color: string,
  files: File[]
) {
  const clave = `${talle}__${color}`;

  setFotosPorColor({
    ...fotosPorColor,
    [clave]: files,
  });
}

  const [nuevoTalle, setNuevoTalle] = useState("");
  const [nuevoTalleEditando, setNuevoTalleEditando] = useState("");

  // =========================
  // SESIÓN
  // =========================

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

  // =========================
  // CARGAR PRODUCTOS
  // =========================

  useEffect(() => {
    if (sesion) {
      cargarProductos();
    }
  }, [sesion]);

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

    const lista = (data || []) as Producto[];

    setProductos(lista);

    await cargarImagenes(lista);
    await cargarVariantes(lista);

    setCargando(false);
  }

  // =========================
  // CARGAR IMÁGENES
  // =========================

  async function cargarImagenes(listaProductos: Producto[]) {
    if (listaProductos.length === 0) {
      setImagenesProducto({});
      return;
    }

    const { data, error } = await supabase
      .from("ProductoImagenes")
      .select("*")
      .order("orden", { ascending: true });

    if (error) {
      console.error("ERROR AL CARGAR IMÁGENES:", error);
      return;
    }

    const mapa: Record<number, ImagenProducto[]> = {};

    listaProductos.forEach((producto) => {
      mapa[producto.id] = [];
    });

    (data || []).forEach((imagen) => {
      const imagenTipada = imagen as ImagenProducto;

      if (!mapa[imagenTipada.producto_id]) {
        mapa[imagenTipada.producto_id] = [];
      }

      mapa[imagenTipada.producto_id].push(imagenTipada);
    });

    setImagenesProducto(mapa);
  }
async function cargarVariantes(listaProductos: Producto[]) {
  const { data, error } = await supabase
    .from("ProductoVariantes")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("ERROR AL CARGAR VARIANTES:", error);
    return;
  }

  const variantesCargadas = (data || []) as Variante[];

  setVariantes(variantesCargadas);

  // =========================
  // CARGAR FOTOS DE VARIANTES
  // =========================

  if (variantesCargadas.length === 0) {
    setImagenesVariantes({});
    return;
  }

  const { data: imagenes, error: errorImagenes } =
    await supabase
      .from("ProductoVarianteImagenes")
      .select("*")
      .order("orden", { ascending: true });

  if (errorImagenes) {
    console.error(
      "ERROR AL CARGAR FOTOS DE VARIANTES:",
      errorImagenes
    );
    return;
  }

  const mapa: Record<number, ImagenVariante[]> = {};

  variantesCargadas.forEach((variante) => {
    if (variante.id) {
      mapa[variante.id] = [];
    }
  });

  (imagenes || []).forEach((imagen) => {
    const imagenTipada = imagen as ImagenVariante;

    if (!mapa[imagenTipada.variante_id]) {
      mapa[imagenTipada.variante_id] = [];
    }

    mapa[imagenTipada.variante_id].push(imagenTipada);
  });

  setImagenesVariantes(mapa);
}

  // =========================
  // ACTUALIZACIONES EN TIEMPO REAL
  // =========================

  useEffect(() => {
    if (!sesion) return;

    const canalProductos = supabase
      .channel("productos-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Productos",
        },
        () => {
          cargarProductos();
        }
      )
      .subscribe();

    const canalImagenes = supabase
      .channel("imagenes-productos-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ProductoImagenes",
        },
        () => {
          cargarProductos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalImagenes);
    };
  }, [sesion]);

  // =========================
  // LOGIN
  // =========================

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

  // =========================
  // CERRAR SESIÓN
  // =========================

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setSesion(null);
  }

  // =========================
  // AGREGAR TALLE NUEVO
  // =========================

  function agregarTalleNuevo() {
    const talle = nuevoTalle.trim();

    if (!talle) return;

    if (nuevoProducto.talles.includes(talle)) {
      alert("Ese talle ya está agregado.");
      return;
    }

    setNuevoProducto({
      ...nuevoProducto,
      talles: [...nuevoProducto.talles, talle],
    });

    setNuevoTalle("");
  }
  function agregarColorATalle(talle: string) {
  const color = nuevoColor.trim();

  if (!color) {
    alert("Ingresá un color.");
    return;
  }

  const coloresActuales = coloresPorTalle[talle] || [];

  if (coloresActuales.includes(color)) {
    alert("Ese color ya está agregado a ese talle.");
    return;
  }

  setColoresPorTalle({
    ...coloresPorTalle,
    [talle]: [...coloresActuales, color],
  });

  setNuevoColor("");
  setTalleParaColor("");
}

  function eliminarTalleNuevo(talle: string) {
    setNuevoProducto({
      ...nuevoProducto,
      talles: nuevoProducto.talles.filter(
        (t) => t !== talle
      ),
    });
  }

  // =========================
  // AGREGAR TALLE EDITANDO
  // =========================

  function agregarTalleEditando() {
    if (!editando) return;

    const talle = nuevoTalleEditando.trim();

    if (!talle) return;

    if (editando.talles.includes(talle)) {
      alert("Ese talle ya está agregado.");
      return;
    }

    setEditando({
      ...editando,
      talles: [...editando.talles, talle],
    });

    setNuevoTalleEditando("");
  }

  function eliminarTalleEditando(talle: string) {
    if (!editando) return;

    setEditando({
      ...editando,
      talles: editando.talles.filter(
        (t) => t !== talle
      ),
    });
  }

  // =========================
  // SUBIR IMÁGENES
  // =========================

async function subirImagenes(
  files: File[],
  productoId: number,
  ordenInicial: number
) {
  const urls: string[] = [];

  if (!files || files.length === 0) {
    return urls;
  }

  setSubiendoImagen(true);

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        alert(`${file.name} no es una imagen válida.`);
        continue;
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const nombreArchivo =
        `${productoId}-${Date.now()}-${i}-${Math.random()
          .toString(36)
          .substring(2, 8)}.${extension}`;

      // SUBIR AL STORAGE
      const { error: errorStorage } = await supabase.storage
        .from("PRODUCTOS")
        .upload(nombreArchivo, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (errorStorage) {
        console.error(
          "ERROR STORAGE:",
          errorStorage
        );

        alert(
          `Error al subir "${file.name}": ${errorStorage.message}`
        );

        continue;
      }

      // OBTENER URL PÚBLICA
      const { data: publicUrlData } =
        supabase.storage
          .from("PRODUCTOS")
          .getPublicUrl(nombreArchivo);

      const url = publicUrlData.publicUrl;

      if (!url) {
        alert(`No se pudo obtener la URL de ${file.name}.`);
        continue;
      }

      // GUARDAR EN ProductoImagenes
      const { error: errorBD } = await supabase
        .from("ProductoImagenes")
        .insert({
          producto_id: productoId,
          image_url: url,
          orden: ordenInicial + i,
        });

      if (errorBD) {
        console.error(
          "ERROR ProductoImagenes:",
          errorBD
        );

        alert(
          `La imagen "${file.name}" se subió, pero no se pudo guardar en la base de datos: ${errorBD.message}`
        );

        continue;
      }

      urls.push(url);
    }
  } finally {
    setSubiendoImagen(false);
  }

  return urls;
}
async function subirImagenesDeVariante(
  files: File[],
  varianteId: number
) {
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file.type.startsWith("image/")) {
      continue;
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const nombreArchivo =
      `variante-${varianteId}-${Date.now()}-${i}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

    const { error: errorStorage } = await supabase.storage
      .from("PRODUCTOS")
      .upload(nombreArchivo, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (errorStorage) {
      console.error(
        "ERROR AL SUBIR FOTO DE VARIANTE:",
        errorStorage
      );
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from("PRODUCTOS")
      .getPublicUrl(nombreArchivo);

    const url = publicUrlData.publicUrl;

    if (!url) continue;

    const { error: errorBD } = await supabase
      .from("ProductoVarianteImagenes")
      .insert({
        variante_id: varianteId,
        image_url: url,
        orden: i,
      });

    if (errorBD) {
      console.error(
        "ERROR AL GUARDAR FOTO DE VARIANTE:",
        errorBD
      );
    }
  }
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

  try {
    // =========================
    // CREAR PRODUCTO
    // =========================

    const { data: productoCreado, error } =
      await supabase
        .from("Productos")
        .insert({
          name: nuevoProducto.name.trim(),
          description: nuevoProducto.description.trim(),
          price: Number(nuevoProducto.price),
          image: "",
          category: nuevoProducto.category.trim(),
          stock: Number(nuevoProducto.stock),
          tiene_talle: nuevoProducto.tiene_talle,
          talles: nuevoProducto.tiene_talle
            ? nuevoProducto.talles
            : [],
        })
        .select()
        .single();

    if (error || !productoCreado) {
      console.error("ERROR AL CREAR:", error);

      alert(
        `No se pudo crear el producto:\n\n${
          error?.message ||
          "No se recibió información de Supabase"
        }`
      );

      return;
    }

    // =========================
    // SUBIR IMÁGENES PRINCIPALES
    // =========================

    let urls: string[] = [];

    if (imagenesSeleccionadas.length > 0) {
      urls = await subirImagenes(
        imagenesSeleccionadas,
        productoCreado.id,
        0
      );
    }

    // =========================
    // GUARDAR IMAGEN PRINCIPAL
    // =========================

    if (urls.length > 0) {
      const { error: errorPrincipal } =
        await supabase
          .from("Productos")
          .update({
            image: urls[0],
          })
          .eq("id", productoCreado.id);

      if (errorPrincipal) {
        console.error(
          "ERROR AL GUARDAR IMAGEN PRINCIPAL:",
          errorPrincipal
        );
      }
    }

   // =========================
// GUARDAR VARIANTES
// =========================

for (const talle of nuevoProducto.talles) {
  const colores = coloresPorTalle[talle] || [];

  for (const color of colores) {
    const { data: varianteCreada, error: errorVariante } =
      await supabase
        .from("ProductoVariantes")
        .insert({
          producto_id: productoCreado.id,
          talle,
          color,
        })
        .select()
        .single();

    if (errorVariante || !varianteCreada) {
      console.error(
        "ERROR AL CREAR VARIANTE:",
        errorVariante
      );
      continue;
    }

    const clave = `${talle}__${color}`;
    const fotos = fotosPorColor[clave] || [];

    if (fotos.length > 0) {
      await subirImagenesDeVariante(
        fotos,
        varianteCreada.id
      );
    }
  }
}
    if (nuevoProducto.tiene_talle) {
      for (const talle of nuevoProducto.talles) {
        const colores =
          coloresPorTalle[talle] || [];

        for (const color of colores) {
          const {
            data: varianteCreada,
            error: errorVariante,
          } = await supabase
            .from("ProductoVariantes")
            .insert({
              producto_id: productoCreado.id,
              talle: talle,
              color: color,
            })
            .select()
            .single();

          if (
            errorVariante ||
            !varianteCreada
          ) {
            console.error(
              "ERROR AL CREAR VARIANTE:",
              errorVariante
            );

            continue;
          }

          // =========================
          // FOTOS DE LA VARIANTE
          // =========================

          const clave =
            `${talle}__${color}`;

          const fotos =
            fotosPorColor[clave] || [];

          if (fotos.length > 0) {
            await subirImagenesDeVariante(
              fotos,
              varianteCreada.id!
            );
          }
        }
      }
    }

    // =========================
    // LIMPIAR
    // =========================

    alert("Producto creado correctamente ✅");

    setNuevoProducto({
      ...productoVacio,
      talles: [],
    });

    setImagenesSeleccionadas([]);
    setNuevoTalle("");
    setNuevoColor("");
    setTalleParaColor("");
    setColoresPorTalle({});
    setFotosPorColor({});
    setMostrarNuevo(false);

  } finally {
    setGuardando(false);
    await cargarProductos();
  }
}

  // =========================
  // ELIMINAR IMAGEN
  // =========================

  async function eliminarImagen(imagen: ImagenProducto) {
    const confirmar = window.confirm(
      "¿Querés eliminar esta imagen?"
    );

    if (!confirmar) return;

    if (imagen.id) {
      const { error } = await supabase
       .from("producto_imagenes")
        .delete()
        .eq("id", imagen.id);

      if (error) {
        console.error("ERROR AL ELIMINAR IMAGEN:", error);
        alert("No se pudo eliminar la imagen.");
        return;
      }
    }

    // Si era la imagen principal, buscar otra imagen
    const producto = productos.find(
      (p) => p.id === imagen.producto_id
    );

    if (producto?.image === imagen.image_url) {
      const restantes =
        imagenesProducto[imagen.producto_id]?.filter(
          (img) => img.id !== imagen.id
        ) || [];

      const nuevaPrincipal =
        restantes.length > 0
          ? restantes[0].image_url
          : "";

      await supabase
        .from("Productos")
        .update({
          image: nuevaPrincipal,
        })
        .eq("id", imagen.producto_id);
    }

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

    try {
      const { error } = await supabase
        .from("Productos")
        .update({
          name: editando.name.trim(),
          description: editando.description?.trim() || "",
          price: Number(editando.price),
          image: editando.image?.trim() || "",
          category: editando.category?.trim() || "",
          stock: Number(editando.stock),
          tiene_talle: editando.tiene_talle,
          talles: editando.tiene_talle
            ? editando.talles
            : [],
        })
        .eq("id", editando.id);

      if (error) {
        console.error("ERROR AL ACTUALIZAR:", error);
        alert("No se pudo guardar el producto.");
        return;
      }
      // =========================
// GUARDAR VARIANTES NUEVAS
// =========================

const variantesDelProducto = variantes.filter(
  (variante) =>
    variante.producto_id === editando.id &&
    variante.id === undefined
);

for (const variante of variantesDelProducto) {
  const { data: varianteCreada, error: errorVariante } =
    await supabase
      .from("ProductoVariantes")
      .insert({
        producto_id: editando.id,
        talle: variante.talle,
        color: variante.color,
      })
      .select()
      .single();

  if (errorVariante || !varianteCreada) {
    console.error(
      "ERROR AL GUARDAR VARIANTE:",
      errorVariante
    );
    continue;
  }
  const clave = `${variante.talle}__${variante.color}`;
const fotos = fotosPorColor[clave] || [];

if (fotos.length > 0) {
  await subirImagenesDeVariante(
    fotos,
    varianteCreada.id
  );
}
}

      // Agregar nuevas imágenes
      if (imagenesSeleccionadas.length > 0) {
        const imagenesActuales =
          imagenesProducto[editando.id] || [];

        const ordenInicial = imagenesActuales.length;

        const urlsNuevas = await subirImagenes(
          imagenesSeleccionadas,
          editando.id,
          ordenInicial
        );

        if (!editando.image && urlsNuevas.length > 0) {
          await supabase
            .from("Productos")
            .update({
              image: urlsNuevas[0],
            })
            .eq("id", editando.id);
        }
      }

      alert("Producto actualizado correctamente ✅");

      setEditando(null);
      setImagenesSeleccionadas([]);
      setNuevoTalleEditando("");
    } finally {
      setGuardando(false);
      await cargarProductos();
    }
  }

  // =========================
  // ELIMINAR PRODUCTO
  // =========================

  async function eliminarProducto(id: number) {
    const confirmar = window.confirm(
      "¿Seguro que querés eliminar este producto?"
    );

    if (!confirmar) return;

    const { error: errorImagenes } = await supabase
      .from("ProductoImagenes")
      .delete()
      .eq("producto_id", id);

    if (errorImagenes) {
      console.error(
        "ERROR AL ELIMINAR IMÁGENES:",
        errorImagenes
      );
    }

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

  // =========================
  // PRECIO
  // =========================

  function formatoPrecio(precio: number) {
    return new Intl.NumberFormat("es-AR").format(precio);
  }

  // =========================
  // CARGANDO SESIÓN
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

  // =========================
  // LOGIN
  // =========================

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
            boxShadow:
              "0 3px 20px rgba(0,0,0,0.08)",
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
            onChange={(e) =>
              setEmail(e.target.value)
            }
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                iniciarSesion();
              }
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

  // =========================
  // PANEL
  // =========================

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
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "25px",
            marginBottom: "25px",
            boxShadow:
              "0 3px 15px rgba(0,0,0,0.06)",
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

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  setMostrarNuevo(!mostrarNuevo);
                  setEditando(null);
                  setImagenesSeleccionadas([]);
                  setNuevoTalle("");
                }}
                style={primaryButton}
              >
                {mostrarNuevo
                  ? "✕ Cerrar"
                  : "＋ Nuevo producto"}
              </button>

              <button
                onClick={cerrarSesion}
                style={secondaryButton}
              >
                🔒 Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <div style={statCard}>
            <small style={{ color: "#777" }}>
              Productos
            </small>

            <h2 style={{ margin: "5px 0 0" }}>
              {productos.length}
            </h2>
          </div>

          <div style={statCard}>
            <small style={{ color: "#777" }}>
              Unidades en stock
            </small>

            <h2 style={{ margin: "5px 0 0" }}>
              {productos.reduce(
                (total, producto) =>
                  total +
                  Number(producto.stock || 0),
                0
              )}
            </h2>
          </div>

          <div style={statCard}>
            <small style={{ color: "#777" }}>
              Sin stock
            </small>

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

        {/* ========================= */}
        {/* NUEVO PRODUCTO */}
        {/* ========================= */}

        {mostrarNuevo && (
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "18px",
              marginBottom: "25px",
              boxShadow:
                "0 3px 15px rgba(0,0,0,0.06)",
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
                      price: Number(
                        e.target.value
                      ),
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
                      stock: Number(
                        e.target.value
                      ),
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label>Descripción</label>

                <textarea
                  value={
                    nuevoProducto.description
                  }
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      description:
                        e.target.value,
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

              {/* ========================= */}
              {/* TALLES NUEVO */}
              {/* ========================= */}

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    marginBottom: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      nuevoProducto.tiene_talle
                    }
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        tiene_talle:
                          e.target.checked,
                        talles:
                          e.target.checked
                            ? nuevoProducto.talles
                            : [],
                      })
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                    }}
                  />

                  Este producto tiene talles
                </label>

                {nuevoProducto.tiene_talle && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <input
                        type="text"
                        value={nuevoTalle}
                        onChange={(e) =>
                          setNuevoTalle(
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            agregarTalleNuevo();
                          }
                        }}
                        placeholder="Ej: S"
                        style={{
                          ...inputStyle,
                          marginBottom: 0,
                        }}
                      />

                      <button
                        type="button"
                        onClick={
                          agregarTalleNuevo
                        }
                        style={primaryButton}
                      >
                        ＋ Agregar
                      </button>
                    </div>

                    {nuevoProducto.talles.length >
                      0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {nuevoProducto.talles.map((talle) => (
  <div
    key={talle}
    style={{
      background: "#f8faf8",
      border: "1px solid #e1e7e1",
      borderRadius: "12px",
      padding: "12px",
      marginBottom: "10px",
    }}
  >
    {/* TALLE */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}
    >
      <strong
        style={{
          color: "#263d2d",
          fontSize: "15px",
        }}
      >
        Talle {talle}
      </strong>

      <button
        type="button"
        onClick={() => eliminarTalleNuevo(talle)}
        style={talleDeleteButton}
      >
        ×
      </button>
    </div>

    {/* COLORES */}
    {coloresPorTalle[talle]?.length > 0 && (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "7px",
          marginBottom: "10px",
        }}
      >
    {coloresPorTalle[talle].map((color) => {
  const clave = `${talle}__${color}`;
  const fotos = fotosPorColor[clave] || [];

  return (
    <div
      key={color}
      style={{
        background: "#ffffff",
        border: "1px solid #e0e5e0",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "10px",
      }}
    >
      {/* COLOR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <strong
          style={{
            color: "#263d2d",
          }}
        >
          🎨 {color}
        </strong>
      </div>

      {/* BOTÓN DE FOTOS */}
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          background: "#263d2d",
          color: "white",
          padding: "9px 13px",
          borderRadius: "9px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "bold",
        }}
      >
        📸 Agregar fotos
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(
              e.target.files || []
            );

            seleccionarFotosColor(
              talle,
              color,
              files
            );
          }}
        />
      </label>

      {/* FOTOS SELECCIONADAS */}
      {fotos.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            marginTop: "12px",
            paddingBottom: "4px",
          }}
        >
         {fotos.map((foto, index) => (
  <div
    key={`${foto.name}-${index}`}
    style={{
      position: "relative",
      flexShrink: 0,
    }}
  >
    <img
      src={URL.createObjectURL(foto)}
      alt={foto.name}
      style={{
        width: "70px",
        height: "70px",
        objectFit: "cover",
        borderRadius: "9px",
        display: "block",
      }}
    />
  </div>
))}
        </div>
      )}

      {fotos.length > 0 && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "12px",
            color: "#666",
          }}
        >
          {fotos.length} foto
          {fotos.length !== 1 ? "s" : ""} seleccionada
          {fotos.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
})}
      </div>
    )}

    {/* AGREGAR COLOR */}
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
      }}
    >
      <input
        type="text"
        value={
          talleParaColor === talle
            ? nuevoColor
            : ""
        }
        onChange={(e) => {
          setTalleParaColor(talle);
          setNuevoColor(e.target.value);
        }}
        onFocus={() => {
          setTalleParaColor(talle);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            agregarColorATalle(talle);
          }
        }}
        placeholder="Ej: Negro"
        style={{
          ...inputStyle,
          marginBottom: 0,
          flex: 1,
        }}
      />

      <button
        type="button"
        onClick={() => agregarColorATalle(talle)}
        style={{
          ...secondaryButton,
          marginLeft: 0,
          whiteSpace: "nowrap",
        }}
      >
        ＋ Color
      </button>
    </div>
  </div>
))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ========================= */}
              {/* IMÁGENES NUEVO */}
              {/* ========================= */}

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label>
                  Imágenes del producto
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(
                      e.target.files || []
                    );

                    setImagenesSeleccionadas(
                      files
                    );
                  }}
                  style={inputStyle}
                />

                {imagenesSeleccionadas.length >
                  0 && (
                  <p
                    style={{
                      color: "#666",
                    }}
                  >
                    {
                      imagenesSeleccionadas.length
                    }{" "}
                    imagen(es) seleccionada(s)
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
              }}
            >
              <button
                onClick={crearProducto}
                disabled={
                  guardando ||
                  subiendoImagen
                }
                style={primaryButton}
              >
                {guardando
                  ? "Guardando..."
                  : "💾 Crear producto"}
              </button>
            </div>
          </div>
        )}

        {/* ========================= */}
        {/* BUSCADOR */}
        {/* ========================= */}

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
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
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

        {/* ========================= */}
        {/* PRODUCTOS */}
        {/* ========================= */}

        {cargando ? (
          <div style={mensajeCard}>
            Cargando productos...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div style={mensajeCard}>
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
            {productosFiltrados.map(
              (producto) => {
                const imagenes =
                  imagenesProducto[
                    producto.id
                  ] || [];

                return (
                  <div
                    key={producto.id}
                    style={{
                      background: "white",
                      borderRadius: "18px",
                      overflow: "hidden",
                      boxShadow:
                        "0 3px 15px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* IMAGEN PRINCIPAL */}

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
                          justifyContent:
                            "center",
                          color: "#999",
                        }}
                      >
                        Sin imagen
                      </div>
                    )}

                    <div
                      style={{
                        padding: "20px",
                      }}
                    >
                      {editando?.id ===
                      producto.id ? (
                        <>
                          <h3>
                            Editar producto
                          </h3>

                          <input
                            value={
                              editando.name
                            }
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                name: e.target
                                  .value,
                              })
                            }
                            placeholder="Nombre"
                            style={
                              inputStyle
                            }
                          />

                          <input
                            value={
                              editando.category ||
                              ""
                            }
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                category:
                                  e.target
                                    .value,
                              })
                            }
                            placeholder="Categoría"
                            style={
                              inputStyle
                            }
                          />

                          <textarea
                            value={
                              editando.description ||
                              ""
                            }
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                description:
                                  e.target
                                    .value,
                              })
                            }
                            placeholder="Descripción"
                            style={{
                              ...inputStyle,
                              minHeight:
                                "80px",
                              resize:
                                "vertical",
                            }}
                          />

                          <input
                            type="number"
                            min="0"
                            value={
                              editando.price
                            }
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                price: Number(
                                  e.target
                                    .value
                                ),
                              })
                            }
                            placeholder="Precio"
                            style={
                              inputStyle
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            value={
                              editando.stock
                            }
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                stock: Number(
                                  e.target
                                    .value
                                ),
                              })
                            }
                            placeholder="Stock"
                            style={
                              inputStyle
                            }
                          />

                          {/* ========================= */}
                          {/* TALLES EDITANDO */}
                          {/* ========================= */}

                          <label
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "10px",
                              cursor:
                                "pointer",
                              fontWeight:
                                "bold",
                              marginBottom:
                                "12px",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                editando.tiene_talle
                              }
                              onChange={(e) =>
                                setEditando({
                                  ...editando,
                                  tiene_talle:
                                    e.target
                                      .checked,
                                  talles:
                                    e.target
                                      .checked
                                      ? editando.talles
                                      : [],
                                })
                              }
                              style={{
                                width:
                                  "18px",
                                height:
                                  "18px",
                              }}
                            />

                            Este producto
                            tiene talles
                          </label>

                          {editando.tiene_talle && (
                            <>
                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "8px",
                                  alignItems:
                                    "center",
                                  marginBottom:
                                    "10px",
                                }}
                              >
                                <input
                                  type="text"
                                  value={
                                    nuevoTalleEditando
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    setNuevoTalleEditando(
                                      e.target
                                        .value
                                    )
                                  }
                                  onKeyDown={(
                                    e
                                  ) => {
                                    if (
                                      e.key ===
                                      "Enter"
                                    ) {
                                      e.preventDefault();
                                      agregarTalleEditando();
                                    }
                                  }}
                                  placeholder="Ej: M"
                                  style={{
                                    ...inputStyle,
                                    marginBottom: 0,
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={
                                    agregarTalleEditando
                                  }
                                  style={
                                    primaryButton
                                  }
                                >
                                  ＋ Agregar
                                </button>
                              </div>

                              {editando.talles
                                .length >
                                0 && (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexWrap:
                                      "wrap",
                                    gap: "8px",
                                    marginBottom:
                                      "15px",
                                  }}
                                >
                                  {editando.talles.map(
                                    (
                                      talle
                                    ) => (
                                      <span
                                        key={
                                          talle
                                        }
                                        style={
                                          talleTag
                                        }
                                      >
                                        {talle}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            eliminarTalleEditando(
                                              talle
                                            )
                                          }
                                          style={
                                            talleDeleteButton
                                          }
                                        >
                                          ×
                                        </button>
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          {/* ========================= */}
{/* VARIANTES DEL PRODUCTO */}
{/* ========================= */}

{editando.talles.map((talle) => {
  const variantesDelTalle = variantes.filter(
    (variante) =>
      variante.producto_id === editando.id &&
      variante.talle === talle
  );

  return (
    <div
      key={`variantes-${talle}`}
      style={{
        marginTop: "12px",
        padding: "12px",
        background: "#f8faf8",
        borderRadius: "12px",
        border: "1px solid #e1e7e1",
      }}
    >
      <strong>Talle {talle}</strong>
      <div
  style={{
    display: "flex",
    gap: "8px",
    marginTop: "10px",
  }}
>
  <input
    type="text"
    value={
      talleParaColor === talle
        ? nuevoColor
        : ""
    }
    onChange={(e) => {
      setTalleParaColor(talle);
      setNuevoColor(e.target.value);
    }}
    onFocus={() => {
      setTalleParaColor(talle);
    }}
    placeholder="Ej: Negro"
    style={{
      ...inputStyle,
      marginBottom: 0,
      flex: 1,
    }}
  />

  <button
    type="button"
    onClick={() => {
      const color = nuevoColor.trim();

      if (!color) {
        alert("Ingresá un color.");
        return;
      }

      const yaExiste = variantes.some(
        (v) =>
          v.producto_id === editando.id &&
          v.talle === talle &&
          v.color.toLowerCase() === color.toLowerCase()
      );

      if (yaExiste) {
        alert("Ese color ya existe para ese talle.");
        return;
      }

      setVariantes([
        ...variantes,
        {
          producto_id: editando.id,
          talle,
          color,
        },
      ]);

      setNuevoColor("");
      setTalleParaColor("");
    }}
    style={{
      ...secondaryButton,
      marginLeft: 0,
      whiteSpace: "nowrap",
    }}
  >
    ＋ Color
  </button>
</div>

      {variantesDelTalle.length === 0 ? (
        <p
          style={{
            fontSize: "13px",
            color: "#777",
            marginBottom: 0,
          }}
        >
          No hay colores agregados.
        </p>
      ) : (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {variantesDelTalle.map((variante) => {
            const fotos =
              variante.id
                ? imagenesVariantes[variante.id] || []
                : [];

            return (
              <div
                key={variante.id}
                style={{
                  background: "white",
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              >
                <strong>
                  🎨 {variante.color}
                </strong>

                {fotos.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "7px",
                      overflowX: "auto",
                      marginTop: "8px",
                    }}
                  >
                    {fotos.map((foto) => (
                      <img
                        key={
                          foto.id ||
                          foto.image_url
                        }
                        src={foto.image_url}
                        alt=""
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})}

                          {/* ========================= */}
                          {/* IMÁGENES ACTUALES */}
                          {/* ========================= */}

                          {imagenes.length >
                            0 && (
                            <div
                              style={{
                                marginBottom:
                                  "15px",
                              }}
                            >
                              <p
                                style={{
                                  fontWeight:
                                    "bold",
                                  marginBottom:
                                    "8px",
                                }}
                              >
                                Imágenes actuales
                              </p>

                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "10px",
                                  overflowX:
                                    "auto",
                                  paddingBottom:
                                    "5px",
                                }}
                              >
                                {imagenes.map(
                                  (
                                    imagen
                                  ) => (
                                    <div
                                      key={
                                        imagen.id ||
                                        imagen.image_url
                                      }
                                      style={{
                                        position:
                                          "relative",
                                        flexShrink:
                                          0,
                                      }}
                                    >
                                      <img
                                        src={
                                          imagen.image_url
                                        }
                                        alt=""
                                        style={{
                                          width:
                                            "80px",
                                          height:
                                            "80px",
                                          objectFit:
                                            "cover",
                                          borderRadius:
                                            "10px",
                                          display:
                                            "block",
                                          border:
                                            imagen.image_url ===
                                            editando.image
                                              ? "3px solid #263d2d"
                                              : "1px solid #ddd",
                                        }}
                                      />

                                      {imagen.image_url ===
                                        editando.image && (
                                        <span
                                          style={{
                                            position:
                                              "absolute",
                                            bottom:
                                              "3px",
                                            left:
                                              "3px",
                                            right:
                                              "3px",
                                            background:
                                              "rgba(38,61,45,0.9)",
                                            color:
                                              "white",
                                            fontSize:
                                              "10px",
                                            textAlign:
                                              "center",
                                            borderRadius:
                                              "5px",
                                            padding:
                                              "2px",
                                          }}
                                        >
                                          Principal
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          eliminarImagen(
                                            imagen
                                          )
                                        }
                                        style={{
                                          position:
                                            "absolute",
                                          top:
                                            "-6px",
                                          right:
                                            "-6px",
                                          width:
                                            "24px",
                                          height:
                                            "24px",
                                          borderRadius:
                                            "50%",
                                          border:
                                            "none",
                                          background:
                                            "#9b2929",
                                          color:
                                            "white",
                                          cursor:
                                            "pointer",
                                          fontWeight:
                                            "bold",
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* ========================= */}
                          {/* AGREGAR IMÁGENES */}
                          {/* ========================= */}

                          <label>
                            Agregar imágenes
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files =
                                Array.from(
                                  e.target
                                    .files ||
                                    []
                                );

                              setImagenesSeleccionadas(
                                files
                              );
                            }}
                            style={
                              inputStyle
                            }
                          />

                          {imagenesSeleccionadas.length >
                            0 && (
                            <p
                              style={{
                                color:
                                  "#666",
                              }}
                            >
                              {
                                imagenesSeleccionadas.length
                              }{" "}
                              imagen(es)
                              nueva(s)
                              seleccionada(s)
                            </p>
                          )}

                          {subiendoImagen && (
                            <p
                              style={{
                                color:
                                  "#777",
                              }}
                            >
                              Subiendo
                              imágenes...
                            </p>
                          )}

                          <input
                            value={
                              editando.image ||
                              ""
                            }
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                image:
                                  e.target
                                    .value,
                              })
                            }
                            placeholder="URL de imagen principal"
                            style={
                              inputStyle
                            }
                          />

                          <button
                            onClick={
                              guardarCambios
                            }
                            disabled={
                              guardando ||
                              subiendoImagen
                            }
                            style={
                              primaryButton
                            }
                          >
                            {guardando
                              ? "Guardando..."
                              : "💾 Guardar cambios"}
                          </button>

                          <button
                            onClick={() => {
                              setEditando(
                                null
                              );
                              setImagenesSeleccionadas(
                                []
                              );
                              setNuevoTalleEditando(
                                ""
                              );
                            }}
                            style={
                              secondaryButton
                            }
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <h3
                            style={{
                              margin:
                                "0 0 8px",
                              fontSize:
                                "19px",
                            }}
                          >
                            {producto.name}
                          </h3>

                          {producto.category && (
                            <span
                              style={{
                                display:
                                  "inline-block",
                                background:
                                  "#edf2ed",
                                padding:
                                  "5px 9px",
                                borderRadius:
                                  "20px",
                                fontSize:
                                  "12px",
                                marginBottom:
                                  "10px",
                              }}
                            >
                              {
                                producto.category
                              }
                            </span>
                          )}

                          <p
                            style={{
                              color: "#666",
                              minHeight:
                                "40px",
                            }}
                          >
                            {producto.description ||
                              "Sin descripción"}
                          </p>

                          {producto.tiene_talle &&
                            producto.talles
                              .length >
                              0 && (
                              <p
                                style={{
                                  fontSize:
                                    "14px",
                                  color:
                                    "#555",
                                }}
                              >
                                <strong>
                                  Talles:
                                </strong>{" "}
                                {producto.talles.join(
                                  ", "
                                )}
                              </p>
                            )}

                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              marginBottom:
                                "18px",
                            }}
                          >
                            <strong
                              style={{
                                fontSize:
                                  "20px",
                              }}
                            >
                              $
                              {formatoPrecio(
                                Number(
                                  producto.price
                                )
                              )}
                            </strong>

                            <span
                              style={{
                                fontSize:
                                  "14px",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              Stock:{" "}
                              {producto.stock ||
                                0}
                            </span>
                          </div>

                          {/* MINIATURAS */}

                          {imagenes.length >
                            1 && (
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "7px",
                                overflowX:
                                  "auto",
                                marginBottom:
                                  "15px",
                              }}
                            >
                              {imagenes.map(
                                (
                                  imagen
                                ) => (
                                  <img
                                    key={
                                      imagen.id ||
                                      imagen.image_url
                                    }
                                    src={
                                      imagen.image_url
                                    }
                                    alt=""
                                    style={{
                                      width:
                                        "55px",
                                      height:
                                        "55px",
                                      objectFit:
                                        "cover",
                                      borderRadius:
                                        "7px",
                                      flexShrink:
                                        0,
                                    }}
                                  />
                                )
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              display:
                                "flex",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={() => {
                                setEditando({
                                  ...producto,
                                  talles:
                                    producto.talles ||
                                    [],
                                });

                                setMostrarNuevo(
                                  false
                                );

                                setImagenesSeleccionadas(
                                  []
                                );

                                setNuevoTalleEditando(
                                  ""
                                );
                              }}
                              style={{
                                ...secondaryButton,
                                flex: 1,
                                marginLeft: 0,
                              }}
                            >
                              ✏️ Editar
                            </button>

                            <button
                              onClick={() =>
                                eliminarProducto(
                                  producto.id
                                )
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
                );
              }
            )}
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

const talleTag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  background: "#edf2ed",
  color: "#263d2d",
  padding: "7px 9px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
};

const talleDeleteButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#9b2929",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "17px",
  lineHeight: 1,
  padding: 0,
};

const statCard: React.CSSProperties = {
  background: "white",
  padding: "20px",
  borderRadius: "15px",
  boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
};

const mensajeCard: React.CSSProperties = {
  background: "white",
  padding: "40px",
  textAlign: "center",
  borderRadius: "15px",
};

export default Admin;