import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Producto = {
  id: number;
  created_at?: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string[] | null;
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
  precio: number;
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
  category: [] as string[],
  stock: 0,
  tiene_talle: false,
  talles: [] as string[],
};

const categoriasDisponibles = [
  "Perros",
  "Gatos",
  "Higiene",
  "Accesorios",
];

function alternarCategoria(
  categorias: string[],
  categoria: string
) {
  if (categorias.includes(categoria)) {
    return categorias.filter((c) => c !== categoria);
  }

  return [...categorias, categoria];
}

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

  const [imagenesSeleccionadas, setImagenesSeleccionadas] =
    useState<File[]>([]);

  const [variantes, setVariantes] = useState<Variante[]>([]);

  const [imagenesVariantes, setImagenesVariantes] = useState<
    Record<number, ImagenVariante[]>
  >({});

  /*
   * FOTOS NUEVAS DE LAS VARIANTES
   *
   * La clave es:
   * producto_id__talle__color
   *
   * Esto sirve tanto para variantes existentes
   * como para variantes nuevas.
   */
  const [fotosNuevasVariantes, setFotosNuevasVariantes] =
    useState<Record<string, File[]>>({});

  const [nuevoColor, setNuevoColor] = useState("");
  const [talleParaColor, setTalleParaColor] = useState("");

  const [coloresPorTalle, setColoresPorTalle] = useState<
    Record<string, string[]>
  >({});

  const [fotosPorColor, setFotosPorColor] = useState<
    Record<string, File[]>
  >({});

  function claveVariante(variante: Variante) {
    return `${variante.producto_id}__${variante.talle}__${variante.color}`;
  }

  function seleccionarFotosColor(
    talle: string,
    color: string,
    files: File[]
  ) {
    const clave = `${talle}__${color}`;

    setFotosPorColor((actuales) => ({
      ...actuales,
      [clave]: files,
    }));
  }

  function seleccionarFotosVariante(
    variante: Variante,
    files: File[]
  ) {
    const clave = claveVariante(variante);

    setFotosNuevasVariantes((actuales) => ({
      ...actuales,
      [clave]: files,
    }));
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
    await cargarVariantes();

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

  // =========================
  // CARGAR VARIANTES
  // =========================

  async function cargarVariantes() {
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

    if (variantesCargadas.length === 0) {
      setImagenesVariantes({});
      return;
    }

    const {
      data: imagenes,
      error: errorImagenes,
    } = await supabase
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

    const canalVariantes = supabase
      .channel("variantes-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ProductoVariantes",
        },
        () => {
          cargarProductos();
        }
      )
      .subscribe();

    const canalImagenesVariantes = supabase
      .channel("imagenes-variantes-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ProductoVarianteImagenes",
        },
        () => {
          cargarProductos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalImagenes);
      supabase.removeChannel(canalVariantes);
      supabase.removeChannel(canalImagenesVariantes);
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

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error(
        "ERROR AL INICIAR SESIÓN:",
        error
      );

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
  // TALLES
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

    const coloresActuales =
      coloresPorTalle[talle] || [];

    if (
      coloresActuales.some(
        (c) =>
          c.toLowerCase() === color.toLowerCase()
      )
    ) {
      alert("Ese color ya está agregado a ese talle.");
      return;
    }

    setColoresPorTalle((actuales) => ({
      ...actuales,
      [talle]: [...coloresActuales, color],
    }));

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

    setColoresPorTalle((actuales) => {
      const copia = { ...actuales };
      delete copia[talle];
      return copia;
    });
  }

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
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const nombreArchivo =
          `${productoId}-${Date.now()}-${i}-${Math.random()
            .toString(36)
            .substring(2, 8)}.${extension}`;

        const {
          error: errorStorage,
        } = await supabase.storage
          .from("PRODUCTOS")
          .upload(
            nombreArchivo,
            file,
            {
              cacheControl: "3600",
              upsert: false,
            }
          );

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

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("PRODUCTOS")
          .getPublicUrl(nombreArchivo);

        const url =
          publicUrlData.publicUrl;

        if (!url) {
          alert(
            `No se pudo obtener la URL de ${file.name}.`
          );

          continue;
        }

        const {
          error: errorBD,
        } = await supabase
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

  // =========================
  // SUBIR FOTOS DE VARIANTE
  // =========================

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
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const nombreArchivo =
        `variante-${varianteId}-${Date.now()}-${i}-${Math.random()
          .toString(36)
          .substring(2, 8)}.${extension}`;

      const {
        error: errorStorage,
      } = await supabase.storage
        .from("PRODUCTOS")
        .upload(
          nombreArchivo,
          file,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

      if (errorStorage) {
        console.error(
          "ERROR AL SUBIR FOTO DE VARIANTE:",
          errorStorage
        );

        continue;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("PRODUCTOS")
        .getPublicUrl(nombreArchivo);

      const url =
        publicUrlData.publicUrl;

      if (!url) continue;

      const {
        error: errorBD,
      } = await supabase
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
      const {
        data: productoCreado,
        error,
      } = await supabase
        .from("Productos")
        .insert({
          name: nuevoProducto.name.trim(),
          description:
            nuevoProducto.description.trim(),
          price: Number(nuevoProducto.price),
          image: "",
          category: nuevoProducto.category,
          stock: Number(nuevoProducto.stock),
          tiene_talle:
            nuevoProducto.tiene_talle,
          talles:
            nuevoProducto.tiene_talle
              ? nuevoProducto.talles
              : [],
        })
        .select()
        .single();

      if (error || !productoCreado) {
        console.error(
          "ERROR AL CREAR:",
          error
        );

        alert(
          `No se pudo crear el producto:\n\n${
            error?.message ||
            "No se recibió información de Supabase"
          }`
        );

        return;
      }

      let urls: string[] = [];

      if (
        imagenesSeleccionadas.length > 0
      ) {
        urls = await subirImagenes(
          imagenesSeleccionadas,
          productoCreado.id,
          0
        );
      }

      if (urls.length > 0) {
        const {
          error: errorPrincipal,
        } = await supabase
          .from("Productos")
          .update({
            image: urls[0],
          })
          .eq(
            "id",
            productoCreado.id
          );

        if (errorPrincipal) {
          console.error(
            "ERROR AL GUARDAR IMAGEN PRINCIPAL:",
            errorPrincipal
          );
        }
      }

      // =========================
      // CREAR VARIANTES
      // =========================

      if (nuevoProducto.tiene_talle) {
        for (const talle of nuevoProducto.talles) {
          const colores =
            coloresPorTalle[talle] || [];

          for (const color of colores) {
            const clave =
              `${talle}__${color}`;

            /*
             * Por ahora, cuando se crea una variante,
             * usamos el precio que se haya indicado
             * para esa combinación.
             *
             * La interfaz de precio individual
             * está en la PARTE 2.
             */

            const precioGuardado =
              Number(
                nuevoProducto.price || 0
              );

            const {
              data: varianteCreada,
              error: errorVariante,
            } = await supabase
              .from("ProductoVariantes")
              .insert({
                producto_id:
                  productoCreado.id,
                talle:
                  talle,
                color:
                  color,
                precio:
                  precioGuardado,
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

      alert(
        "Producto creado correctamente ✅"
      );

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
      setFotosNuevasVariantes({});
      setMostrarNuevo(false);
    } finally {
      setGuardando(false);
      await cargarProductos();
    }
  }

  // =========================
  // ELIMINAR IMAGEN
  // =========================

  async function eliminarImagen(
    imagen: ImagenProducto
  ) {
    if (!editando) return;

    const confirmar =
      window.confirm(
        "¿Querés eliminar esta imagen?"
      );

    if (!confirmar) return;

    const {
      error,
    } = await supabase
      .from("ProductoImagenes")
      .delete()
      .eq("id", imagen.id);

    if (error) {
      console.error(
        "ERROR AL ELIMINAR IMAGEN:",
        error
      );

      alert(
        "No se pudo eliminar la imagen."
      );

      return;
    }

    if (
      editando.image ===
      imagen.image_url
    ) {
      const imagenesRestantes =
        imagenesProducto[
          editando.id
        ]?.filter(
          (i) => i.id !== imagen.id
        ) || [];

      const nuevaPrincipal =
        imagenesRestantes[0]
          ?.image_url || "";

      await supabase
        .from("Productos")
        .update({
          image: nuevaPrincipal,
        })
        .eq(
          "id",
          editando.id
        );

      setEditando({
        ...editando,
        image: nuevaPrincipal,
      });
    }

    await cargarProductos();
  }

  // =========================
  // ELIMINAR PRODUCTO
  // =========================

  async function eliminarProducto(
    id: number
  ) {
    const confirmar =
      window.confirm(
        "¿Seguro que querés eliminar este producto?"
      );

    if (!confirmar) return;

    const {
      error: errorImagenes,
    } = await supabase
      .from("ProductoImagenes")
      .delete()
      .eq(
        "producto_id",
        id
      );

    if (errorImagenes) {
      console.error(
        "ERROR AL ELIMINAR IMÁGENES:",
        errorImagenes
      );
    }

    const {
      error: errorProducto,
    } = await supabase
      .from("Productos")
      .delete()
      .eq("id", id);

    if (errorProducto) {
      console.error(
        "ERROR AL ELIMINAR PRODUCTO:",
        errorProducto
      );

      alert(
        `No se pudo eliminar el producto:\n\n${errorProducto.message}`
      );

      return;
    }

    alert(
      "Producto eliminado correctamente."
    );

    setEditando(null);
    await cargarProductos();
  }

  // =========================
  // GUARDAR CAMBIOS
  // =========================

  async function guardarCambios() {
    if (!editando) return;

    if (!editando.name.trim()) {
      alert(
        "El producto necesita un nombre."
      );
      return;
    }

    if (editando.price < 0) {
      alert(
        "El precio no puede ser negativo."
      );
      return;
    }

    if (editando.stock < 0) {
      alert(
        "El stock no puede ser negativo."
      );
      return;
    }

    setGuardando(true);

    try {
      const {
        error,
      } = await supabase
        .from("Productos")
        .update({
          name:
            editando.name.trim(),
          description:
            editando.description?.trim() ||
            "",
          price:
            Number(editando.price),
          image:
            editando.image || "",
          category:
            editando.category || [],
          stock:
            Number(editando.stock),
          tiene_talle:
            editando.tiene_talle,
          talles:
            editando.tiene_talle
              ? editando.talles
              : [],
        })
        .eq(
          "id",
          editando.id
        );

      if (error) {
        console.error(
          "ERROR AL GUARDAR PRODUCTO:",
          error
        );

        alert(
          `No se pudieron guardar los cambios:\n\n${error.message}`
        );

        return;
      }

      // =========================
      // ACTUALIZAR VARIANTES EXISTENTES
      // =========================

      const variantesExistentes =
        variantes.filter(
          (variante) =>
            variante.producto_id ===
              editando.id &&
            variante.id !== undefined
        );

      for (const variante of variantesExistentes) {
        const {
          error: errorPrecio,
        } = await supabase
          .from("ProductoVariantes")
          .update({
            precio:
              Number(
                variante.precio || 0
              ),
          })
          .eq(
            "id",
            variante.id
          );

        if (errorPrecio) {
          console.error(
            "ERROR AL ACTUALIZAR PRECIO DE VARIANTE:",
            errorPrecio
          );
        }

        /*
         * Si elegimos fotos nuevas para esta variante,
         * las subimos ahora.
         */
        const clave =
          claveVariante(variante);

        const fotos =
          fotosNuevasVariantes[clave] || [];

        if (
          variante.id &&
          fotos.length > 0
        ) {
          await subirImagenesDeVariante(
            fotos,
            variante.id
          );
        }
      }

      // =========================
      // INSERTAR VARIANTES NUEVAS
      // =========================

      const variantesNuevas =
        variantes.filter(
          (variante) =>
            variante.producto_id ===
              editando.id &&
            variante.id === undefined
        );

      for (const variante of variantesNuevas) {
        const {
          data: varianteCreada,
          error: errorVariante,
        } = await supabase
          .from("ProductoVariantes")
          .insert({
            producto_id:
              editando.id,
            talle:
              variante.talle,
            color:
              variante.color,
            precio:
              Number(
                variante.precio ||
                  editando.price ||
                  0
              ),
          })
          .select()
          .single();

        if (
          errorVariante ||
          !varianteCreada
        ) {
          console.error(
            "ERROR AL INSERTAR VARIANTE:",
            errorVariante
          );

          continue;
        }

        /*
         * Subimos las fotos que se hayan elegido
         * para la variante nueva.
         */
        const clave =
          claveVariante(variante);

        const fotos =
          fotosNuevasVariantes[clave] || [];

        if (fotos.length > 0) {
          await subirImagenesDeVariante(
            fotos,
            varianteCreada.id!
          );
        }

        // Reemplazamos la variante temporal
        // por la variante real de Supabase.
        setVariantes(
          (variantesActuales) =>
            variantesActuales.map(
              (v) => {
                if (
                  v.id === undefined &&
                  v.producto_id ===
                    variante.producto_id &&
                  v.talle ===
                    variante.talle &&
                  v.color ===
                    variante.color
                ) {
                  return varianteCreada as Variante;
                }

                return v;
              }
            )
        );
      }

      // =========================
      // IMÁGENES GENERALES
      // =========================

      const imagenesActuales =
        imagenesProducto[
          editando.id
        ] || [];

      if (
        imagenesSeleccionadas.length > 0
      ) {
        await subirImagenes(
          imagenesSeleccionadas,
          editando.id,
          imagenesActuales.length
        );
      }

      alert(
        "Cambios guardados correctamente ✅"
      );

      setImagenesSeleccionadas([]);
      setFotosNuevasVariantes({});
      setEditando(null);
      setNuevoTalleEditando("");
      setNuevoColor("");
      setTalleParaColor("");

      await cargarProductos();
    } finally {
      setGuardando(false);
    }
  }
  // =========================
  // ABRIR EDICIÓN
  // =========================

  function abrirEdicion(producto: Producto) {
    setEditando({
      ...producto,
      category: producto.category || [],
      talles: producto.talles || [],
    });

    setMostrarNuevo(false);
    setImagenesSeleccionadas([]);
    setFotosNuevasVariantes({});
    setNuevoTalleEditando("");
    setNuevoColor("");
    setTalleParaColor("");
  }

  // =========================
  // CANCELAR EDICIÓN
  // =========================

  function cancelarEdicion() {
    setEditando(null);
    setImagenesSeleccionadas([]);
    setFotosNuevasVariantes({});
    setNuevoTalleEditando("");
    setNuevoColor("");
    setTalleParaColor("");
  }

  // =========================
  // AGREGAR COLOR AL EDITAR
  // =========================

  function agregarColorEditando(talle: string) {
    if (!editando) return;

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

    const nuevaVariante: Variante = {
      producto_id: editando.id,
      talle,
      color,
      precio: Number(editando.price || 0),
    };

    setVariantes((actuales) => [
      ...actuales,
      nuevaVariante,
    ]);

    setNuevoColor("");
    setTalleParaColor("");
  }

  // =========================
  // ELIMINAR VARIANTE
  // =========================

  async function eliminarVariante(variante: Variante) {
    const confirmar = window.confirm(
      `¿Querés eliminar la variante ${variante.talle} - ${variante.color}?`
    );

    if (!confirmar) return;

    // Si todavía no existe en Supabase,
    // solamente la quitamos de la pantalla.
    if (!variante.id) {
      setVariantes((actuales) =>
        actuales.filter((v) => v !== variante)
      );

      const clave = claveVariante(variante);

      setFotosNuevasVariantes((actuales) => {
        const copia = { ...actuales };
        delete copia[clave];
        return copia;
      });

      return;
    }

    // Eliminar fotos de la variante
    const { error: errorFotos } = await supabase
      .from("ProductoVarianteImagenes")
      .delete()
      .eq("variante_id", variante.id);

    if (errorFotos) {
      console.error(
        "ERROR AL ELIMINAR FOTOS DE VARIANTE:",
        errorFotos
      );
    }

    // Eliminar variante
    const { error } = await supabase
      .from("ProductoVariantes")
      .delete()
      .eq("id", variante.id);

    if (error) {
      console.error(
        "ERROR AL ELIMINAR VARIANTE:",
        error
      );

      alert(
        `No se pudo eliminar la variante:\n\n${error.message}`
      );

      return;
    }

    setVariantes((actuales) =>
      actuales.filter(
        (v) => v.id !== variante.id
      )
    );

    setImagenesVariantes((actuales) => {
      const copia = { ...actuales };

      if (variante.id) {
        delete copia[variante.id];
      }

      return copia;
    });

    await cargarVariantes();
  }

  // =========================
  // PRODUCTOS FILTRADOS
  // =========================

  const productosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return productos;
    }

    return productos.filter((producto) => {
      const nombre =
        producto.name?.toLowerCase() || "";

      const descripcion =
        producto.description?.toLowerCase() || "";

      const categorias =
        producto.category
          ?.join(" ")
          .toLowerCase() || "";

      return (
        nombre.includes(texto) ||
        descripcion.includes(texto) ||
        categorias.includes(texto)
      );
    });
  }, [productos, busqueda]);

  // =========================
  // ESTILOS
  // =========================

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #d8ddd8",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "#263d2d",
  };

  const buttonStyle: React.CSSProperties = {
    border: "none",
    borderRadius: "8px",
    padding: "10px 15px",
    cursor: "pointer",
    fontWeight: 600,
  };

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
          background: "#f0ead2",
          color: "#263d2d",
        }}
      >
        Cargando...
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
          background: "#f0ead2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "#fff",
            borderRadius: "14px",
            padding: "30px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            boxSizing: "border-box",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              color: "#263d2d",
              textAlign: "center",
            }}
          >
            LuckePet
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#666",
              marginBottom: "25px",
            }}
          >
            Panel de administración
          </p>

          <label style={labelStyle}>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Tu email"
            style={{
              ...inputStyle,
              marginBottom: "15px",
            }}
          />

          <label style={labelStyle}>
            Contraseña
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Tu contraseña"
            style={{
              ...inputStyle,
              marginBottom: "20px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                iniciarSesion();
              }
            }}
          />

          <button
            onClick={iniciarSesion}
            disabled={iniciandoSesion}
            style={{
              ...buttonStyle,
              width: "100%",
              background: "#263d2d",
              color: "#fff",
              opacity: iniciandoSesion
                ? 0.7
                : 1,
            }}
          >
            {iniciandoSesion
              ? "Ingresando..."
              : "Ingresar"}
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // ADMIN
  // =========================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0ead2",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* ENCABEZADO */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#263d2d",
                fontSize: "28px",
              }}
            >
              LuckePet
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#666",
              }}
            >
              Administrar productos
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
                setMostrarNuevo(true);
                setEditando(null);

                setNuevoProducto({
                  ...productoVacio,
                  talles: [],
                });

                setImagenesSeleccionadas([]);
                setColoresPorTalle({});
                setFotosPorColor({});
                setFotosNuevasVariantes({});
                setNuevoTalle("");
                setNuevoColor("");
                setTalleParaColor("");
              }}
              style={{
                ...buttonStyle,
                background: "#263d2d",
                color: "#fff",
              }}
            >
              + Nuevo producto
            </button>

            <button
              onClick={cerrarSesion}
              style={{
                ...buttonStyle,
                background: "#fff",
                color: "#263d2d",
                border: "1px solid #263d2d",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* BUSCADOR */}

        <div
          style={{
            background: "#fff",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            style={inputStyle}
          />
        </div>

        {/* FORMULARIO NUEVO */}

        {mostrarNuevo && (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "25px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                gap: "10px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: "#263d2d",
                }}
              >
                Nuevo producto
              </h2>

              <button
                onClick={() => {
                  setMostrarNuevo(false);
                  setImagenesSeleccionadas([]);
                  setColoresPorTalle({});
                  setFotosPorColor({});
                  setFotosNuevasVariantes({});
                }}
                style={{
                  ...buttonStyle,
                  background: "#eee",
                  color: "#333",
                }}
              >
                Cancelar
              </button>
            </div>

            {/* DATOS BÁSICOS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "15px",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Nombre
                </label>

                <input
                  value={nuevoProducto.name}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      name: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Precio general
                </label>

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
                <label style={labelStyle}>
                  Stock
                </label>

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
            </div>

            <div style={{ marginTop: "15px" }}>
              <label style={labelStyle}>
                Descripción
              </label>

              <textarea
                value={nuevoProducto.description}
                onChange={(e) =>
                  setNuevoProducto({
                    ...nuevoProducto,
                    description: e.target.value,
                  })
                }
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            {/* CATEGORÍAS */}

            <div style={{ marginTop: "20px" }}>
              <label style={labelStyle}>
                Categorías
              </label>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >
                {categoriasDisponibles.map(
                  (categoria) => (
                    <label
                      key={categoria}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={nuevoProducto.category.includes(
                          categoria
                        )}
                        onChange={() =>
                          setNuevoProducto({
                            ...nuevoProducto,
                            category:
                              alternarCategoria(
                                nuevoProducto.category,
                                categoria
                              ),
                          })
                        }
                      />

                      {categoria}
                    </label>
                  )
                )}
              </div>
            </div>

            {/* IMÁGENES GENERALES */}

            <div style={{ marginTop: "20px" }}>
              <label style={labelStyle}>
                Imágenes generales
              </label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setImagenesSeleccionadas(
                    Array.from(
                      e.target.files || []
                    )
                  )
                }
                style={inputStyle}
              />

              {imagenesSeleccionadas.length >
                0 && (
                <p
                  style={{
                    fontSize: "13px",
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

            {/* TALLES */}

            <div
              style={{
                marginTop: "25px",
                paddingTop: "20px",
                borderTop:
                  "1px solid #e5e5e5",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#263d2d",
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
                    })
                  }
                />

                Este producto tiene talles/colores
              </label>
            </div>

            {nuevoProducto.tiene_talle && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  borderRadius: "10px",
                  background: "#f8f8f4",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#263d2d",
                  }}
                >
                  Talles y variantes
                </h3>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    value={nuevoTalle}
                    onChange={(e) =>
                      setNuevoTalle(
                        e.target.value
                      )
                    }
                    placeholder="Ej: S, M, L"
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: "180px",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarTalleNuevo();
                      }
                    }}
                  />

                  <button
                    onClick={
                      agregarTalleNuevo
                    }
                    style={{
                      ...buttonStyle,
                      background: "#263d2d",
                      color: "#fff",
                    }}
                  >
                    + Agregar talle
                  </button>
                </div>

                {nuevoProducto.talles.map(
                  (talle) => {
                    const colores =
                      coloresPorTalle[talle] || [];

                    return (
                      <div
                        key={talle}
                        style={{
                          background: "#fff",
                          borderRadius: "10px",
                          padding: "15px",
                          marginBottom: "15px",
                          border:
                            "1px solid #e1e1e1",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "12px",
                          }}
                        >
                          <strong
                            style={{
                              color: "#263d2d",
                              fontSize: "16px",
                            }}
                          >
                            Talle: {talle}
                          </strong>

                          <button
                            onClick={() =>
                              eliminarTalleNuevo(
                                talle
                              )
                            }
                            style={{
                              ...buttonStyle,
                              background:
                                "#f1dede",
                              color: "#9b3333",
                              padding:
                                "7px 10px",
                            }}
                          >
                            Eliminar talle
                          </button>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginBottom: "15px",
                          }}
                        >
                          <input
                            value={
                              talleParaColor ===
                              talle
                                ? nuevoColor
                                : ""
                            }
                            onFocus={() =>
                              setTalleParaColor(
                                talle
                              )
                            }
                            onChange={(e) => {
                              setTalleParaColor(
                                talle
                              );
                              setNuevoColor(
                                e.target.value
                              );
                            }}
                            placeholder="Ej: Negro, Rojo..."
                            style={{
                              ...inputStyle,
                              flex: 1,
                              minWidth:
                                "180px",
                            }}
                          />

                          <button
                            onClick={() =>
                              agregarColorATalle(
                                talle
                              )
                            }
                            style={{
                              ...buttonStyle,
                              background:
                                "#e5eadf",
                              color: "#263d2d",
                            }}
                          >
                            + Agregar color
                          </button>
                        </div>

                        {colores.map(
                          (color) => {
                            const clave =
                              `${talle}__${color}`;

                    const fotos = fotosPorColor[clave] || [];

                            return (
                              <div
                                key={clave}
                                style={{
                                  border:
                                    "1px solid #ddd",
                                  borderRadius:
                                    "8px",
                                  padding: "12px",
                                  marginTop:
                                    "10px",
                                  background:
                                    "#fafafa",
                                }}
                              >
                                <strong
                                  style={{
                                    color:
                                      "#263d2d",
                                  }}
                                >
                                  🎨 {color}
                                </strong>

                                <div
                                  style={{
                                    marginTop:
                                      "10px",
                                  }}
                                >
                                  <label
                                    style={{
                                      ...labelStyle,
                                      fontSize:
                                        "13px",
                                    }}
                                  >
                                    Precio de esta
                                    combinación
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      nuevoProducto.price
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      setNuevoProducto({
                                        ...nuevoProducto,
                                        price:
                                          Number(
                                            e.target
                                              .value
                                          ),
                                      })
                                    }
                                    style={{
                                      ...inputStyle,
                                      maxWidth:
                                        "220px",
                                    }}
                                  />
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      "10px",
                                  }}
                                >
                                  <label
                                    style={{
                                      ...labelStyle,
                                      fontSize:
                                        "13px",
                                    }}
                                  >
                                    Fotos de esta
                                    combinación
                                  </label>

                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(
                                      e
                                    ) =>
                                      seleccionarFotosColor(
                                        talle,
                                        color,
                                        Array.from(
                                          e.target
                                            .files ||
                                            []
                                        )
                                      )
                                    }
                                    style={
                                      inputStyle
                                    }
                                  />

                                  {fotos.length >
                                    0 && (
                                    <p
                                      style={{
                                        fontSize:
                                          "12px",
                                        color:
                                          "#666",
                                      }}
                                    >
                                      {
                                        fotos.length
                                      }{" "}
                                      imagen(es)
                                      seleccionada(s)
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={crearProducto}
                disabled={
                  guardando ||
                  subiendoImagen
                }
                style={{
                  ...buttonStyle,
                  background: "#263d2d",
                  color: "#fff",
                  padding: "12px 22px",
                }}
              >
                {guardando
                  ? "Guardando..."
                  : "Crear producto"}
              </button>
            </div>
          </div>
        )}
        {/* =========================
            LISTA DE PRODUCTOS
        ========================= */}

        {cargando ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              color: "#666",
            }}
          >
            Cargando productos...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No se encontraron productos.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {productosFiltrados.map((producto) => {
             

              return (
                <div
                  key={producto.id}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    overflow: "hidden",
                    boxShadow:
                      "0 4px 15px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      height: "220px",
                      background: "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {producto.image ? (
                      <img
                        src={producto.image}
                        alt={producto.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#999" }}>
                        Sin imagen
                      </span>
                    )}
                  </div>

                  <div style={{ padding: "15px" }}>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        color: "#263d2d",
                      }}
                    >
                      {producto.name}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 5px",
                        fontWeight: 700,
                      }}
                    >
                      ${producto.price}
                    </p>

                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: "13px",
                        color: "#666",
                      }}
                    >
                      Stock: {producto.stock}
                    </p>

                    {producto.category &&
                      producto.category.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                          }}
                        >
                          {producto.category.map(
                            (categoria) => (
                              <span
                                key={categoria}
                                style={{
                                  background: "#e5eadf",
                                  color: "#263d2d",
                                  padding: "4px 8px",
                                  borderRadius: "20px",
                                  fontSize: "11px",
                                }}
                              >
                                {categoria}
                              </span>
                            )
                          )}
                        </div>
                      )}

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() =>
                          abrirEdicion(producto)
                        }
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          background: "#263d2d",
                          color: "#fff",
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminarProducto(producto.id)
                        }
                        style={{
                          ...buttonStyle,
                          background: "#f1dede",
                          color: "#9b3333",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================
            MODAL EDITAR PRODUCTO
        ========================= */}

        {editando && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "15px",
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "800px",
                maxHeight: "95vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: "14px",
                padding: "20px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#263d2d",
                  }}
                >
                  Editar producto
                </h2>

                <button
                  onClick={cancelarEdicion}
                  style={{
                    ...buttonStyle,
                    background: "#eee",
                    color: "#333",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* DATOS BÁSICOS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Nombre
                  </label>

                  <input
                    value={editando.name}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        name: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Precio general
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={editando.price}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        price: Number(
                          e.target.value
                        ),
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={editando.stock}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        stock: Number(
                          e.target.value
                        ),
                      })
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginTop: "15px" }}>
                <label style={labelStyle}>
                  Descripción
                </label>

                <textarea
                  value={editando.description || ""}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* CATEGORÍAS */}

              <div style={{ marginTop: "20px" }}>
                <label style={labelStyle}>
                  Categorías
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  {categoriasDisponibles.map(
                    (categoria) => (
                      <label
                        key={categoria}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(
                            editando.category || []
                          ).includes(categoria)}
                          onChange={() =>
                            setEditando({
                              ...editando,
                              category:
                                alternarCategoria(
                                  editando.category || [],
                                  categoria
                                ),
                            })
                          }
                        />

                        {categoria}
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* IMÁGENES GENERALES */}

              <div style={{ marginTop: "20px" }}>
                <label style={labelStyle}>
                  Imágenes actuales
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {(
                    imagenesProducto[editando.id] || []
                  ).map((imagen) => (
                    <div
                      key={imagen.id}
                      style={{
                        width: "100px",
                        position: "relative",
                      }}
                    >
                      <img
                        src={imagen.image_url}
                        alt=""
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border:
                            editando.image ===
                            imagen.image_url
                              ? "3px solid #263d2d"
                              : "1px solid #ddd",
                        }}
                      />

                      <button
                        onClick={() =>
                          eliminarImagen(imagen)
                        }
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "24px",
                          height: "24px",
                          border: "none",
                          borderRadius: "50%",
                          background: "#fff",
                          color: "#a00",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setImagenesSeleccionadas(
                      Array.from(
                        e.target.files || []
                      )
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop: "12px",
                  }}
                />

                {imagenesSeleccionadas.length >
                  0 && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {imagenesSeleccionadas.length}{" "}
                    imagen(es) nueva(s)
                    seleccionada(s).
                  </p>
                )}
              </div>

              {/* TIENE TALLE */}

              <div
                style={{
                  marginTop: "25px",
                  paddingTop: "20px",
                  borderTop:
                    "1px solid #e5e5e5",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 600,
                    color: "#263d2d",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editando.tiene_talle}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        tiene_talle:
                          e.target.checked,
                      })
                    }
                  />

                  Este producto tiene talles/colores
                </label>
              </div>

              {/* VARIANTES */}

              {editando.tiene_talle && (
                <div
                  style={{
                    marginTop: "20px",
                    background: "#f8f8f4",
                    padding: "15px",
                    borderRadius: "10px",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color: "#263d2d",
                    }}
                  >
                    Talles y variantes
                  </h3>

                  {/* AGREGAR TALLE */}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "20px",
                    }}
                  >
                    <input
                      value={nuevoTalleEditando}
                      onChange={(e) =>
                        setNuevoTalleEditando(
                          e.target.value
                        )
                      }
                      placeholder="Ej: S, M, L"
                      style={{
                        ...inputStyle,
                        flex: 1,
                        minWidth: "180px",
                      }}
                    />

                    <button
                      onClick={
                        agregarTalleEditando
                      }
                      style={{
                        ...buttonStyle,
                        background: "#263d2d",
                        color: "#fff",
                      }}
                    >
                      + Agregar talle
                    </button>
                  </div>

                  {editando.talles.map(
                    (talle) => {
                      const variantesDelTalle =
                        variantes.filter(
                          (v) =>
                            v.producto_id ===
                              editando.id &&
                            v.talle === talle
                        );

                      return (
                        <div
                          key={talle}
                          style={{
                            background: "#fff",
                            border:
                              "1px solid #ddd",
                            borderRadius: "10px",
                            padding: "15px",
                            marginBottom: "15px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "center",
                              marginBottom: "12px",
                            }}
                          >
                            <strong
                              style={{
                                color: "#263d2d",
                              }}
                            >
                              Talle: {talle}
                            </strong>

                            <button
                              onClick={() =>
                                eliminarTalleEditando(
                                  talle
                                )
                              }
                              style={{
                                ...buttonStyle,
                                background:
                                  "#f1dede",
                                color: "#9b3333",
                                padding:
                                  "7px 10px",
                              }}
                            >
                              Eliminar talle
                            </button>
                          </div>

                          {/* AGREGAR COLOR */}

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                              marginBottom: "12px",
                            }}
                          >
                            <input
                              value={
                                talleParaColor ===
                                talle
                                  ? nuevoColor
                                  : ""
                              }
                              onFocus={() =>
                                setTalleParaColor(
                                  talle
                                )
                              }
                              onChange={(e) => {
                                setTalleParaColor(
                                  talle
                                );
                                setNuevoColor(
                                  e.target.value
                                );
                              }}
                              placeholder="Ej: Negro, Rojo..."
                              style={{
                                ...inputStyle,
                                flex: 1,
                                minWidth:
                                  "180px",
                              }}
                            />

                            <button
                              onClick={() =>
                                agregarColorEditando(
                                  talle
                                )
                              }
                              style={{
                                ...buttonStyle,
                                background:
                                  "#e5eadf",
                                color: "#263d2d",
                              }}
                            >
                              + Agregar color
                            </button>
                          </div>

                          {/* COLORES */}

                          {variantesDelTalle.map(
                            (variante) => {
                              const fotos =
                                variante.id
                                  ? imagenesVariantes[
                                      variante.id
                                    ] || []
                                  : [];

                              const clave =
                                claveVariante(
                                  variante
                                );

                              const fotosNuevas =
                                fotosNuevasVariantes[
                                  clave
                                ] || [];

                              return (
                                <div
                                  key={
                                    variante.id ||
                                    clave
                                  }
                                  style={{
                                    border:
                                      "1px solid #ddd",
                                    borderRadius:
                                      "8px",
                                    padding: "12px",
                                    marginTop:
                                      "10px",
                                    background:
                                      "#fafafa",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent:
                                        "space-between",
                                      alignItems:
                                        "center",
                                      gap: "10px",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color:
                                          "#263d2d",
                                      }}
                                    >
                                      🎨{" "}
                                      {
                                        variante.color
                                      }
                                    </strong>

                                    <button
                                      onClick={() =>
                                        eliminarVariante(
                                          variante
                                        )
                                      }
                                      style={{
                                        ...buttonStyle,
                                        background:
                                          "#f1dede",
                                        color:
                                          "#9b3333",
                                        padding:
                                          "6px 9px",
                                      }}
                                    >
                                      Eliminar
                                    </button>
                                  </div>

                                  {/* PRECIO */}

                                  <div
                                    style={{
                                      marginTop:
                                        "10px",
                                    }}
                                  >
                                    <label
                                      style={{
                                        ...labelStyle,
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      Precio de esta
                                      combinación
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        variante.precio
                                      }
                                      onChange={(e) => {
                                        const precio =
                                          Number(
                                            e.target.value
                                          );

                                        setVariantes(
                                          (actuales) =>
                                            actuales.map(
                                              (v) =>
                                                (
                                                  v.id &&
                                                  variante.id &&
                                                  v.id ===
                                                    variante.id
                                                ) ||
                                                v ===
                                                  variante
                                                  ? {
                                                      ...v,
                                                      precio,
                                                    }
                                                  : v
                                            )
                                        );
                                      }}
                                      style={{
                                        ...inputStyle,
                                        maxWidth:
                                          "220px",
                                      }}
                                    />
                                  </div>

                                  {/* FOTOS ACTUALES */}

                                  {fotos.length >
                                    0 && (
                                    <div
                                      style={{
                                        marginTop:
                                          "12px",
                                      }}
                                    >
                                      <label
                                        style={{
                                          ...labelStyle,
                                          fontSize:
                                            "13px",
                                        }}
                                      >
                                        Imágenes actuales
                                      </label>

                                      <div
                                        style={{
                                          display:
                                            "flex",
                                          gap: "8px",
                                          flexWrap:
                                            "wrap",
                                        }}
                                      >
                                        {fotos.map(
                                          (foto) => (
                                            <img
                                              key={
                                                foto.id
                                              }
                                              src={
                                                foto.image_url
                                              }
                                              alt=""
                                              style={{
                                                width:
                                                  "75px",
                                                height:
                                                  "75px",
                                                objectFit:
                                                  "cover",
                                                borderRadius:
                                                  "7px",
                                              }}
                                            />
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* NUEVAS FOTOS */}

                                  <div
                                    style={{
                                      marginTop:
                                        "12px",
                                    }}
                                  >
                                    <label
                                      style={{
                                        ...labelStyle,
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      Agregar fotos para
                                      esta combinación
                                    </label>

                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) =>
                                        seleccionarFotosVariante(
                                          variante,
                                          Array.from(
                                            e.target
                                              .files ||
                                              []
                                          )
                                        )
                                      }
                                      style={
                                        inputStyle
                                      }
                                    />

                                    {fotosNuevas.length >
                                      0 && (
                                      <p
                                        style={{
                                          fontSize:
                                            "12px",
                                          color:
                                            "#666",
                                          margin:
                                            "5px 0 0",
                                        }}
                                      >
                                        {
                                          fotosNuevas.length
                                        }{" "}
                                        imagen(es)
                                        nueva(s)
                                        seleccionada(s).
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}

                          {variantesDelTalle.length ===
                            0 && (
                            <p
                              style={{
                                color: "#777",
                                fontSize: "13px",
                              }}
                            >
                              No hay colores para
                              este talle todavía.
                            </p>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {/* BOTONES */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "25px",
                  paddingTop: "20px",
                  borderTop:
                    "1px solid #e5e5e5",
                }}
              >
                <button
                  onClick={cancelarEdicion}
                  disabled={guardando}
                  style={{
                    ...buttonStyle,
                    background: "#eee",
                    color: "#333",
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarCambios}
                  disabled={
                    guardando ||
                    subiendoImagen
                  }
                  style={{
                    ...buttonStyle,
                    background: "#263d2d",
                    color: "#fff",
                    padding: "12px 22px",
                  }}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;