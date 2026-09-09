import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Producto = {
  id: number;
  orden?: number;
  created_at?: string;
  name: string;
  description: string | null;
  price: number;
  descuento_porcentaje?: number;
  image: string | null;
  category: string[] | null;
  stock: number;
  tiene_talle: boolean;
  talles: string[];
};

type Categoria = {
  id: number;
  nombre: string;
  parent_id: number | null;
  orden: number;
  activa: boolean;
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

type Pedido = {
  id: number;
  nombre: string;
  apellido: string;
  direccion: string;
  codigo_postal: string;
  telefono: string;
  email: string;
  total: number;
  estado: "pendiente" | "confirmado" | "cancelado";
  fecha: string;
};

type PedidoItem = {
  id: number;
  pedido_id: number;
  producto_id: number;
  nombre_producto: string;
  talle: string | null;
  color: string | null;
  variante_id: number | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen: string | null;
};

/* ============================================================
   ESTADÍSTICAS
============================================================ */

type Visita = {
  id: number;
  session_id: string;
  evento: string;
  producto_id: number | null;
  producto_nombre: string | null;
  dispositivo: string | null;
  fecha: string;
};

type PeriodoEstadisticas = "hoy" | "7dias" | "30dias";

const productoVacio = {
  name: "",
  description: "",
  price: 0,
  descuento_porcentaje: 0,
  image: "",
  category: [] as string[],
  stock: 0,
  tiene_talle: false,
  talles: [] as string[],
};

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

  const [productoArrastrado, setProductoArrastrado] = useState<number | null>(null);
  const [imagenArrastrada, setImagenArrastrada] = useState<number | null>(null);

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

  const [preciosPorColor, setPreciosPorColor] = useState<
    Record<string, number>
  >({});

  const [nuevoTalle, setNuevoTalle] = useState("");
  const [nuevoTalleEditando, setNuevoTalleEditando] = useState("");

  // ============================================================
  // CATEGORÍAS JERÁRQUICAS
  // ============================================================
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCategoriaJerarquica, setNuevaCategoriaJerarquica] = useState("");
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");
  const [categoriaPadreNueva, setCategoriaPadreNueva] = useState<number | "">("");
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);

  const categoriasDisponibles = useMemo(() => {
    const categoriasDeProductos = productos.flatMap((producto) =>
      Array.isArray(producto.category) ? producto.category : producto.category ? [producto.category] : []
    );
    return Array.from(new Set([
      ...categorias.map((categoria) => categoria.nombre),
      ...categoriasDeProductos,
    ])).filter(Boolean);
  }, [productos, categorias]);

  async function cargarCategorias() {
    const { data, error } = await supabase
      .from("Categorias")
      .select("id, nombre, parent_id, orden, activa")
      .eq("activa", true)
      .order("orden", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.warn("Categorias no disponible todavía. Ejecutá la migración SQL indicada.", error);
      setCategorias([]);
      return;
    }

    setCategorias((data || []) as Categoria[]);
  }

  async function agregarCategoriaPrincipal() {
    const nombre = nuevaCategoriaJerarquica.trim().replace(/\s+/g, " ");
    if (!nombre) { alert("Escribí un nombre para la categoría."); return; }
    if (categorias.some(c => c.parent_id === null && c.nombre.toLowerCase() === nombre.toLowerCase())) { alert("Esa categoría principal ya existe."); return; }
    setGuardandoCategoria(true);
    try {
      const siguienteOrden = categorias.filter(c => c.parent_id === null).reduce((m,c) => Math.max(m, Number(c.orden)||0),0)+1;
      const { error } = await supabase.from("Categorias").insert({ nombre, parent_id: null, orden: siguienteOrden, activa: true });
      if (error) throw error;
      setNuevaCategoriaJerarquica("");
      await cargarCategorias();
    } catch (error) {
      console.error("ERROR AGREGANDO CATEGORÍA:", error);
      alert(`No se pudo agregar la categoría:\n\n${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally { setGuardandoCategoria(false); }
  }

  async function agregarCategoriaJerarquica() {
    const nombre = nuevaSubcategoria.trim().replace(/\s+/g, " ");
    if (!nombre) { alert("Escribí un nombre para la subcategoría."); return; }
    if (!categoriaPadreNueva) { alert("Elegí la categoría padre."); return; }
    if (categorias.some(c => c.parent_id === Number(categoriaPadreNueva) && c.nombre.toLowerCase() === nombre.toLowerCase())) { alert("Esa subcategoría ya existe dentro de esa categoría."); return; }
    setGuardandoCategoria(true);
    try {
      const hermanos = categorias.filter(c => c.parent_id === Number(categoriaPadreNueva));
      const siguienteOrden = hermanos.reduce((m,c) => Math.max(m, Number(c.orden)||0),0)+1;
      const { error } = await supabase.from("Categorias").insert({ nombre, parent_id: Number(categoriaPadreNueva), orden: siguienteOrden, activa: true });
      if (error) throw error;
      setNuevaSubcategoria("");
      await cargarCategorias();
    } catch (error) {
      console.error("ERROR AGREGANDO SUBCATEGORÍA:", error);
      alert(`No se pudo agregar la subcategoría:\n\n${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally { setGuardandoCategoria(false); }
  }

  async function eliminarCategoriaJerarquica(categoria: Categoria) {
    const hijos = categorias.filter(c => c.parent_id === categoria.id);
    if (!window.confirm(hijos.length ? `"${categoria.nombre}" tiene ${hijos.length} subcategoría(s). También se eliminarán. ¿Continuar?` : `¿Eliminar "${categoria.nombre}"?`)) return;
    setGuardandoCategoria(true);
    try {
      const { error } = await supabase.from("Categorias").delete().eq("id", categoria.id);
      if (error) throw error;
      await cargarCategorias();
    } catch (error) {
      console.error("ERROR ELIMINANDO CATEGORÍA:", error);
      alert(`No se pudo eliminar:\n\n${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally { setGuardandoCategoria(false); }
  }

  useEffect(() => {
    cargarCategorias();
  }, []);

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [cargandoEstadisticas, setCargandoEstadisticas] =
    useState(false);

  const [periodoEstadisticas, setPeriodoEstadisticas] =
    useState<PeriodoEstadisticas>("7dias");

  // ============================================================
  // PEDIDOS
  // ============================================================

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoItems, setPedidoItems] = useState<
    Record<number, PedidoItem[]>
  >({});
  const [pedidoAbierto, setPedidoAbierto] = useState<number | null>(null);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [procesandoPedido, setProcesandoPedido] = useState<number | null>(
    null
  );
  const [seccionAbierta, setSeccionAbierta] =
    useState<"productos" | "categorias" | "estadisticas" | "pedidos" | null>(
      "productos"
    );
  const [menuAbierto, setMenuAbierto] = useState(false);
  const productosRef = useRef<HTMLDivElement | null>(null);
  const categoriasRef = useRef<HTMLDivElement | null>(null);
  const pedidosRef = useRef<HTMLDivElement | null>(null);
  const estadisticasRef = useRef<HTMLDivElement | null>(null);

  function alternarSeccion(
    seccion: "productos" | "categorias" | "estadisticas" | "pedidos"
  ) {
    setSeccionAbierta(seccion);
    setMenuAbierto(false);
    window.setTimeout(() => {
      const refs: Record<string, { current: HTMLDivElement | null }> = {
        productos: productosRef,
        categorias: categoriasRef,
        pedidos: pedidosRef,
        estadisticas: estadisticasRef,
      };
      refs[seccion]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function claveVariante(variante: Variante) {
    return `${variante.producto_id}__${variante.talle}__${variante.color}`;
  }

  function clavePrecioNuevo(talle: string, color: string) {
    return `${talle}__${color}`;
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

  // ============================================================
  // CARGAR ESTADÍSTICAS
  // ============================================================

  async function cargarEstadisticas() {
    setCargandoEstadisticas(true);

    const { data, error } = await supabase
      .from("Visitas")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error(
        "ERROR AL CARGAR ESTADÍSTICAS:",
        error
      );

      setVisitas([]);
      setCargandoEstadisticas(false);
      return;
    }

    setVisitas((data || []) as Visita[]);
    setCargandoEstadisticas(false);
  }

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
  // CARGAR PRODUCTOS, PEDIDOS
  // Y ESTADÍSTICAS
  // =========================

  useEffect(() => {
    if (sesion) {
      cargarProductos();
      cargarPedidos();
      cargarEstadisticas();
    }
  }, [sesion]);

  async function cargarProductos() {
    setCargando(true);

    const { data, error } = await supabase
      .from("Productos")
      .select("*")
      .order("orden", { ascending: true, nullsFirst: false })
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
  // CARGAR PEDIDOS
  // =========================

  async function cargarPedidos() {
    setCargandoPedidos(true);

    const { data: pedidosData, error: pedidosError } = await supabase
      .from("Pedidos")
      .select("*")
      .order("fecha", { ascending: false });

    if (pedidosError) {
      console.error(
        "ERROR AL CARGAR PEDIDOS:",
        pedidosError
      );

      setPedidos([]);
      setPedidoItems({});
      setCargandoPedidos(false);
      return;
    }

    const listaPedidos = (pedidosData || []) as Pedido[];

    setPedidos(listaPedidos);

    const { data: itemsData, error: itemsError } = await supabase
      .from("PedidoItems")
      .select("*")
      .order("id", { ascending: true });

    if (itemsError) {
      console.error(
        "ERROR AL CARGAR ITEMS DE PEDIDOS:",
        itemsError
      );

      setPedidoItems({});
      setCargandoPedidos(false);
      return;
    }

    const mapa: Record<number, PedidoItem[]> = {};

    (itemsData || []).forEach((item) => {
      const tipado = item as PedidoItem;

      if (!mapa[tipado.pedido_id]) {
        mapa[tipado.pedido_id] = [];
      }

      mapa[tipado.pedido_id].push(tipado);
    });

    setPedidoItems(mapa);
    setCargandoPedidos(false);
  }

  // =========================
  // CONFIRMAR PEDIDO
  // =========================

  async function confirmarPedido(pedidoId: number) {
    const confirmar = window.confirm(
      "¿Confirmar este pedido?\n\nSe descontará el stock reservado."
    );

    if (!confirmar) return;

    setProcesandoPedido(pedidoId);

    try {
      const { error } = await supabase.rpc("confirmar_pedido", {
        p_pedido_id: pedidoId,
      });

      if (error) {
        console.error(
          "ERROR AL CONFIRMAR PEDIDO:",
          error
        );

        alert(
          `No se pudo confirmar el pedido:\n\n${error.message}`
        );

        return;
      }

      alert("Pedido confirmado correctamente.");

      await Promise.all([
        cargarPedidos(),
        cargarProductos(),
        cargarEstadisticas(),
      ]);
    } finally {
      setProcesandoPedido(null);
    }
  }

  // =========================
  // CANCELAR PEDIDO
  // =========================

  async function cancelarPedido(pedidoId: number) {
    const confirmar = window.confirm(
      "¿Eliminar este pedido?\n\nSi está pendiente, el stock reservado será devuelto automáticamente."
    );

    if (!confirmar) return;

    setProcesandoPedido(pedidoId);

    try {
      const { error } = await supabase.rpc(
        "eliminar_pedido",
        {
          p_pedido_id: pedidoId,
        }
      );

      if (error) {
        console.error(
          "ERROR AL ELIMINAR PEDIDO:",
          error
        );

        alert(
          `No se pudo eliminar el pedido:\n\n${error.message}`
        );

        return;
      }

      setPedidos((actuales) =>
        actuales.filter(
          (pedido) =>
            pedido.id !== pedidoId
        )
      );

      setPedidoItems((actuales) => {
        const copia = {
          ...actuales,
        };

        delete copia[pedidoId];

        return copia;
      });

      if (pedidoAbierto === pedidoId) {
        setPedidoAbierto(null);
      }

      await cargarProductos();
      await cargarEstadisticas();

      alert(
        "Pedido eliminado y stock restaurado correctamente."
      );
    } finally {
      setProcesandoPedido(null);
    }
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
      console.error(
        "ERROR AL CARGAR IMÁGENES:",
        error
      );
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

      mapa[imagenTipada.producto_id].push(
        imagenTipada
      );
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
      console.error(
        "ERROR AL CARGAR VARIANTES:",
        error
      );
      return;
    }

    const variantesCargadas =
      (data || []) as Variante[];

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
      const imagenTipada =
        imagen as ImagenVariante;

      if (!mapa[imagenTipada.variante_id]) {
        mapa[imagenTipada.variante_id] = [];
      }

      mapa[imagenTipada.variante_id].push(
        imagenTipada
      );
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

    const canalPedidos = supabase
      .channel("pedidos-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Pedidos",
        },
        () => {
          cargarPedidos();
          cargarProductos();
          cargarEstadisticas();
        }
      )
      .subscribe();

    const canalPedidoItems = supabase
      .channel("pedido-items-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "PedidoItems",
        },
        () => {
          cargarPedidos();
        }
      )
      .subscribe();

    const canalVisitas = supabase
      .channel("visitas-cambios")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Visitas",
        },
        () => {
          cargarEstadisticas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalImagenes);
      supabase.removeChannel(canalVariantes);
      supabase.removeChannel(
        canalImagenesVariantes
      );
      supabase.removeChannel(canalPedidos);
      supabase.removeChannel(canalPedidoItems);
      supabase.removeChannel(canalVisitas);
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

      alert(
        "Email o contraseña incorrectos."
      );

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
      talles: [
        ...nuevoProducto.talles,
        talle,
      ],
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
          c.toLowerCase() ===
          color.toLowerCase()
      )
    ) {
      alert(
        "Ese color ya está agregado a ese talle."
      );
      return;
    }

    setColoresPorTalle((actuales) => ({
      ...actuales,
      [talle]: [
        ...coloresActuales,
        color,
      ],
    }));

    const clave = clavePrecioNuevo(
      talle,
      color
    );

    setPreciosPorColor((actuales) => ({
      ...actuales,
      [clave]: Number(
        nuevoProducto.price || 0
      ),
    }));

    setNuevoColor("");
    setTalleParaColor("");
  }

  function eliminarTalleNuevo(talle: string) {
    setNuevoProducto({
      ...nuevoProducto,
      talles:
        nuevoProducto.talles.filter(
          (t) => t !== talle
        ),
    });

    setColoresPorTalle((actuales) => {
      const copia = { ...actuales };
      delete copia[talle];
      return copia;
    });

    setPreciosPorColor((actuales) => {
      const copia = { ...actuales };

      Object.keys(copia).forEach(
        (clave) => {
          if (
            clave.startsWith(
              `${talle}__`
            )
          ) {
            delete copia[clave];
          }
        }
      );

      return copia;
    });

    setFotosPorColor((actuales) => {
      const copia = { ...actuales };

      Object.keys(copia).forEach(
        (clave) => {
          if (
            clave.startsWith(
              `${talle}__`
            )
          ) {
            delete copia[clave];
          }
        }
      );

      return copia;
    });
  }

  function agregarTalleEditando() {
    if (!editando) return;

    const talle =
      nuevoTalleEditando.trim();

    if (!talle) return;

    if (editando.talles.includes(talle)) {
      alert(
        "Ese talle ya está agregado."
      );
      return;
    }

    setEditando({
      ...editando,
      talles: [
        ...editando.talles,
        talle,
      ],
    });

    setNuevoTalleEditando("");
  }

  function eliminarTalleEditando(
    talle: string
  ) {
    if (!editando) return;

    setEditando({
      ...editando,
      talles:
        editando.talles.filter(
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
    if (!files?.length) return urls;
    setSubiendoImagen(true);
    try {
      const archivos = files.filter(file => file.type.startsWith("image/"));
      for (let i = 0; i < archivos.length; i++) {
        const file = archivos[i];
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const nombreArchivo = `${productoId}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
        const { error: storageError } = await supabase.storage.from("PRODUCTOS").upload(nombreArchivo, file, { cacheControl: "3600", upsert: false });
        if (storageError) { console.error("ERROR STORAGE:", storageError); continue; }
        const { data } = supabase.storage.from("PRODUCTOS").getPublicUrl(nombreArchivo);
        const url = data.publicUrl;
        if (!url) continue;
        const { error: dbError } = await supabase.from("ProductoImagenes").insert({ producto_id: productoId, image_url: url, orden: ordenInicial + i });
        if (dbError) {
          console.error("ERROR ProductoImagenes:", dbError);
          await supabase.storage.from("PRODUCTOS").remove([nombreArchivo]);
          continue;
        }
        urls.push(url);
      }
    } finally { setSubiendoImagen(false); }
    return urls;
  }

  // =========================
  // SUBIR FOTOS DE VARIANTE
  // =========================

  async function subirImagenesDeVariante(files: File[], varianteId: number) {
    if (!files?.length) return;
    const { data: existentes } = await supabase.from("ProductoVarianteImagenes").select("orden").eq("variante_id", varianteId).order("orden", { ascending: false }).limit(1);
    const ordenInicial = Number(existentes?.[0]?.orden ?? -1) + 1;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const nombreArchivo = `variante-${varianteId}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
      const { error: storageError } = await supabase.storage.from("PRODUCTOS").upload(nombreArchivo, file, { cacheControl: "3600", upsert: false });
      if (storageError) { console.error("ERROR AL SUBIR FOTO DE VARIANTE:", storageError); continue; }
      const { data } = supabase.storage.from("PRODUCTOS").getPublicUrl(nombreArchivo);
      const url = data.publicUrl;
      if (!url) continue;
      const { error: dbError } = await supabase.from("ProductoVarianteImagenes").insert({ variante_id: varianteId, image_url: url, orden: ordenInicial + i });
      if (dbError) { console.error("ERROR AL GUARDAR FOTO DE VARIANTE:", dbError); await supabase.storage.from("PRODUCTOS").remove([nombreArchivo]); }
    }
  }

  // =========================
  // CREAR PRODUCTO
  // =========================

  async function crearProducto() {
    if (!nuevoProducto.name.trim()) {
      alert(
        "El producto necesita un nombre."
      );
      return;
    }

    if (nuevoProducto.price < 0) {
      alert(
        "El precio no puede ser negativo."
      );
      return;
    }

    if (Number(nuevoProducto.descuento_porcentaje || 0) < 0 || Number(nuevoProducto.descuento_porcentaje || 0) > 100) { alert("El descuento debe estar entre 0% y 100%."); return; }

    if (nuevoProducto.stock < 0) {
      alert(
        "El stock no puede ser negativo."
      );
      return;
    }

    for (const [
      clave,
      precio,
    ] of Object.entries(
      preciosPorColor
    )) {
      if (Number(precio) < 0) {
        alert(
          `El precio de la combinación ${clave.replace(
            "__",
            " - "
          )} no puede ser negativo.`
        );
        return;
      }
    }

    setGuardando(true);

    try {
      const {
        data: productoCreado,
        error,
      } = await supabase
        .from("Productos")
        .insert({
          name:
            nuevoProducto.name.trim(),
          description:
            nuevoProducto.description.trim(),
          price:
            Number(
              nuevoProducto.price
            ),
          descuento_porcentaje: Math.min(100, Math.max(0, Number(nuevoProducto.descuento_porcentaje || 0))),
          image: "",
          category:
            nuevoProducto.category,
          stock:
            Number(
              nuevoProducto.stock
            ),
          tiene_talle:
            nuevoProducto.tiene_talle,
          talles:
            nuevoProducto.tiene_talle
              ? nuevoProducto.talles
              : [],
          orden:
            productos.length > 0
              ? Math.max(...productos.map((p) => Number(p.orden) || 0)) + 1
              : 1,
        })
        .select()
        .single();

      if (
        error ||
        !productoCreado
      ) {
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
        imagenesSeleccionadas.length >
        0
      ) {
        urls =
          await subirImagenes(
            imagenesSeleccionadas,
            productoCreado.id,
            0
          );
      }

      if (urls.length > 0) {
        const {
          error:
            errorPrincipal,
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

      // CREAR VARIANTES

      if (
        nuevoProducto.tiene_talle
      ) {
        for (
          const talle of nuevoProducto.talles
        ) {
          const colores =
            coloresPorTalle[
              talle
            ] || [];

          for (
            const color of colores
          ) {
            const clave =
              clavePrecioNuevo(
                talle,
                color
              );

            const precioGuardado =
              Number(
                preciosPorColor[
                  clave
                ] ??
                  nuevoProducto.price ??
                  0
              );

            const {
              data:
                varianteCreada,
              error:
                errorVariante,
            } = await supabase
              .from(
                "ProductoVariantes"
              )
              .insert({
                producto_id:
                  productoCreado.id,
                talle,
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
              fotosPorColor[
                clave
              ] || [];

            if (
              fotos.length > 0
            ) {
              await subirImagenesDeVariante(
                fotos,
                varianteCreada.id!
              );
            }
          }
        }
      }

      alert(
        "Producto creado correctamente."
      );

      setNuevoProducto({
        ...productoVacio,
        talles: [],
      });

      setImagenesSeleccionadas(
        []
      );
      setNuevoTalle("");
      setNuevoColor("");
      setTalleParaColor("");
      setColoresPorTalle({});
      setFotosPorColor({});
      setPreciosPorColor({});
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
async function eliminarImagen(imagen: ImagenProducto) {
  if (!editando) return;
  if (!window.confirm("¿Querés eliminar esta imagen definitivamente?")) return;

  const productoId = editando.id;
  const extraerRutaStorage = (url: string) => {
    try {
      const parsed = new URL(url);
      const marker = "/storage/v1/object/public/PRODUCTOS/";
      const index = parsed.pathname.indexOf(marker);
      return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + marker.length)) : null;
    } catch { return null; }
  };

  // Primero verificamos que la fila exista y obtenemos la URL real guardada.
  const { data: existente, error: errorConsulta } = await supabase
    .from("ProductoImagenes")
    .select("id, producto_id, image_url")
    .eq("id", imagen.id)
    .maybeSingle();

  if (errorConsulta) {
    console.error("ERROR CONSULTANDO IMAGEN:", errorConsulta);
    alert(`No se pudo comprobar la imagen:\n\n${errorConsulta.message}`);
    return;
  }

  if (!existente) {
    // La fila ya no existe: sincronizamos la UI para que no vuelva a mostrarse.
    setImagenesProducto(prev => ({ ...prev, [productoId]: (prev[productoId] || []).filter(i => i.id !== imagen.id) }));
    alert("La imagen ya no estaba guardada en la base de datos.");
    return;
  }

  const { data: eliminadas, error: errorEliminar } = await supabase
    .from("ProductoImagenes")
    .delete()
    .eq("id", imagen.id)
    .select("id, image_url");

  if (errorEliminar) {
    console.error("ERROR AL ELIMINAR IMAGEN:", errorEliminar);
    alert(`No se pudo eliminar la imagen:\n\n${errorEliminar.message}`);
    return;
  }

  // Si Supabase devolvió cero filas, normalmente es una política RLS que impide borrar.
  if (!eliminadas || eliminadas.length === 0) {
    alert("Supabase no eliminó la imagen. Revisá las políticas RLS de ProductoImagenes para permitir DELETE al usuario administrador.");
    return;
  }

  const urlGuardada = (eliminadas[0] as any).image_url || existente.image_url || imagen.image_url;
  const rutaStorage = extraerRutaStorage(urlGuardada);
  if (rutaStorage) {
    const { error: storageError } = await supabase.storage.from("PRODUCTOS").remove([rutaStorage]);
    if (storageError) {
      console.warn("La fila fue eliminada, pero no se pudo borrar el archivo de Storage:", storageError);
    }
  }

  const imagenesRestantes = (imagenesProducto[productoId] || []).filter(i => i.id !== imagen.id);
  setImagenesProducto(prev => ({ ...prev, [productoId]: imagenesRestantes }));

  // Si era la imagen principal, actualizar Productos para que tampoco reaparezca al recargar.
  if (editando.image === urlGuardada || editando.image === imagen.image_url) {
    const nuevaPrincipal = imagenesRestantes[0]?.image_url || "";
    const { error: errorPrincipal } = await supabase
      .from("Productos")
      .update({ image: nuevaPrincipal })
      .eq("id", productoId);

    if (errorPrincipal) {
      console.error("ERROR AL CAMBIAR IMAGEN PRINCIPAL:", errorPrincipal);
      alert(`La imagen se eliminó, pero no se pudo actualizar la principal:\n\n${errorPrincipal.message}`);
    }

    setEditando(actual => actual ? { ...actual, image: nuevaPrincipal } : actual);
    setProductos(prev => prev.map(producto => producto.id === productoId ? { ...producto, image: nuevaPrincipal } : producto));
  }

  // Confirmación real: volvemos a consultar esa fila; si no existe, no puede reaparecer desde DB.
  const { data: comprobacion } = await supabase.from("ProductoImagenes").select("id").eq("id", imagen.id).maybeSingle();
  if (comprobacion) {
    alert("La imagen no quedó eliminada de Supabase. Revisá las políticas RLS de DELETE.");
    return;
  }

  alert("Imagen eliminada definitivamente.");
}

  // =========================
  // ORDEN MANUAL DE PRODUCTOS
  // =========================

 async function reordenarProductos(productoDestinoId: number) {
  if (
    productoArrastrado === null ||
    productoArrastrado === productoDestinoId
  ) {
    return;
  }

  const ordenados = [...productos].sort(
    (a, b) =>
      (Number(a.orden) || 0) -
        (Number(b.orden) || 0) ||
      a.id - b.id
  );

  const origen = ordenados.findIndex(
    (p) => p.id === productoArrastrado
  );

  const destino = ordenados.findIndex(
    (p) => p.id === productoDestinoId
  );

  if (origen < 0 || destino < 0) {
    setProductoArrastrado(null);
    return;
  }

  // Movemos visualmente el producto
  const [movido] = ordenados.splice(origen, 1);

  ordenados.splice(destino, 0, movido);

  // Actualizamos la pantalla inmediatamente
  setProductos(ordenados);

  setProductoArrastrado(null);

  // Guardamos los nuevos órdenes EN PARALELO
  const actualizaciones = ordenados.map(
    (producto, indice) =>
      supabase
        .from("Productos")
        .update({
          orden: indice + 1,
        })
        .eq("id", producto.id)
  );

  const resultados = await Promise.all(
    actualizaciones
  );

  const error = resultados.find(
    (resultado) => resultado.error
  )?.error;

  if (error) {
    console.error(
      "ERROR GUARDANDO ORDEN DE PRODUCTOS:",
      error
    );

    alert(
      `No se pudo guardar el orden:\n\n${error.message}`
    );
  }
}

  // =========================
  // ORDEN MANUAL DE IMÁGENES
  // =========================

  async function reordenarImagenes(productoId: number, imagenDestinoId: number) {
    if (imagenArrastrada === null || imagenArrastrada === imagenDestinoId) return;

    const actuales = [...(imagenesProducto[productoId] || [])].sort(
      (a, b) => Number(a.orden) - Number(b.orden) || (a.id || 0) - (b.id || 0)
    );
    const origen = actuales.findIndex((i) => i.id === imagenArrastrada);
    const destino = actuales.findIndex((i) => i.id === imagenDestinoId);
    if (origen < 0 || destino < 0) return;

    const [movida] = actuales.splice(origen, 1);
    actuales.splice(destino, 0, movida);

    setImagenesProducto((prev) => ({ ...prev, [productoId]: actuales }));
    setImagenArrastrada(null);

    for (let i = 0; i < actuales.length; i++) {
      if (!actuales[i].id) continue;
      const { error } = await supabase
        .from("ProductoImagenes")
        .update({ orden: i })
        .eq("id", actuales[i].id);
      if (error) {
        console.error("ERROR GUARDANDO ORDEN DE IMÁGENES:", error);
        alert(`No se pudo guardar el orden de las imágenes:\n\n${error.message}`);
        await cargarProductos();
        return;
      }
    }
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

    if (Number(editando.descuento_porcentaje || 0) < 0 || Number(editando.descuento_porcentaje || 0) > 100) { alert("El descuento debe estar entre 0% y 100%."); return; }

    if (editando.stock < 0) {
      alert(
        "El stock no puede ser negativo."
      );
      return;
    }

    const variantesDelProducto =
      variantes.filter(
        (variante) =>
          variante.producto_id ===
          editando.id
      );

    for (
      const variante of variantesDelProducto
    ) {
      if (
        Number(variante.precio) <
        0
      ) {
        alert(
          `El precio de ${variante.talle} - ${variante.color} no puede ser negativo.`
        );
        return;
      }
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
            Number(
              editando.price
            ),
          descuento_porcentaje: Math.min(100, Math.max(0, Number(editando.descuento_porcentaje || 0))),
          image:
            editando.image || "",
          category:
            editando.category || [],
          stock:
            Number(
              editando.stock
            ),
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

      // ACTUALIZAR VARIANTES EXISTENTES

      const variantesExistentes =
        variantes.filter(
          (variante) =>
            variante.producto_id ===
              editando.id &&
            variante.id !==
              undefined
        );

      for (
        const variante of variantesExistentes
      ) {
        const {
          error:
            errorPrecio,
        } = await supabase
          .from(
            "ProductoVariantes"
          )
          .update({
            precio:
              Number(
                variante.precio ||
                  0
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

        const clave =
          claveVariante(
            variante
          );

        const fotos =
          fotosNuevasVariantes[
            clave
          ] || [];

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

      // INSERTAR VARIANTES NUEVAS

      const variantesNuevas =
        variantes.filter(
          (variante) =>
            variante.producto_id ===
              editando.id &&
            variante.id ===
              undefined
        );

      for (
        const variante of variantesNuevas
      ) {
        const {
          data:
            varianteCreada,
          error:
            errorVariante,
        } = await supabase
          .from(
            "ProductoVariantes"
          )
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

        const clave =
          claveVariante(
            variante
          );

        const fotos =
          fotosNuevasVariantes[
            clave
          ] || [];

        if (
          fotos.length > 0
        ) {
          await subirImagenesDeVariante(
            fotos,
            varianteCreada.id!
          );
        }

        setVariantes(
          (
            variantesActuales
          ) =>
            variantesActuales.map(
              (v) => {
                if (
                  v.id ===
                    undefined &&
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

      // IMÁGENES GENERALES

      const imagenesActuales =
        imagenesProducto[
          editando.id
        ] || [];

      if (
        imagenesSeleccionadas.length >
        0
      ) {
        await subirImagenes(
          imagenesSeleccionadas,
          editando.id,
          imagenesActuales.length
        );
      }

      alert(
        "Cambios guardados correctamente."
      );

      setImagenesSeleccionadas(
        []
      );
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

  function abrirEdicion(
    producto: Producto
  ) {
    setEditando({
      ...producto,
      category:
        producto.category || [],
      talles:
        producto.talles || [],
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

  function agregarColorEditando(
    talle: string
  ) {
    if (!editando) return;

    const color =
      nuevoColor.trim();

    if (!color) {
      alert("Ingresá un color.");
      return;
    }

    const yaExiste =
      variantes.some(
        (v) =>
          v.producto_id ===
            editando.id &&
          v.talle === talle &&
          v.color.toLowerCase() ===
            color.toLowerCase()
      );

    if (yaExiste) {
      alert(
        "Ese color ya existe para ese talle."
      );
      return;
    }

    const nuevaVariante: Variante = {
      producto_id:
        editando.id,
      talle,
      color,
      precio:
        Number(
          editando.price || 0
        ),
    };

    setVariantes(
      (actuales) => [
        ...actuales,
        nuevaVariante,
      ]
    );

    setNuevoColor("");
    setTalleParaColor("");
  }

  // =========================
  // ELIMINAR VARIANTE
  // =========================

  async function eliminarVariante(
    variante: Variante
  ) {
    const confirmar =
      window.confirm(
        `¿Querés eliminar la variante ${variante.talle} - ${variante.color}?`
      );

    if (!confirmar) return;

    if (!variante.id) {
      setVariantes(
        (actuales) =>
          actuales.filter(
            (v) =>
              v !== variante
          )
      );

      const clave =
        claveVariante(
          variante
        );

      setFotosNuevasVariantes(
        (actuales) => {
          const copia = {
            ...actuales,
          };

          delete copia[clave];

          return copia;
        }
      );

      return;
    }

    const {
      error: errorFotos,
    } = await supabase
      .from(
        "ProductoVarianteImagenes"
      )
      .delete()
      .eq(
        "variante_id",
        variante.id
      );

    if (errorFotos) {
      console.error(
        "ERROR AL ELIMINAR FOTOS DE VARIANTE:",
        errorFotos
      );
    }

    const { error } =
      await supabase
        .from(
          "ProductoVariantes"
        )
        .delete()
        .eq(
          "id",
          variante.id
        );

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

    setVariantes(
      (actuales) =>
        actuales.filter(
          (v) =>
            v.id !==
            variante.id
        )
    );

    setImagenesVariantes(
      (actuales) => {
        const copia = {
          ...actuales,
        };

        if (variante.id) {
          delete copia[
            variante.id
          ];
        }

        return copia;
      }
    );

    await cargarVariantes();
  }

  // =========================
  // PRODUCTOS FILTRADOS
  // =========================

  const productosFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      if (!texto) {
        return productos;
      }

      return productos.filter(
        (producto) => {
          const nombre =
            producto.name?.toLowerCase() ||
            "";

          const descripcion =
            producto.description?.toLowerCase() ||
            "";

          const categorias =
            producto.category
              ?.join(" ")
              .toLowerCase() ||
              "";

  return (
            nombre.includes(
              texto
            ) ||
            descripcion.includes(
              texto
            ) ||
            categorias.includes(
              texto
            )
          );
        }
      );
    }, [productos, busqueda]);

  // ============================================================
  // DATOS DE ESTADÍSTICAS
  // ============================================================

  const visitasPeriodo = useMemo(() => {
    const ahora = new Date();

    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);

    if (periodoEstadisticas === "7dias") {
      inicio.setDate(
        inicio.getDate() - 6
      );
    }

    if (periodoEstadisticas === "30dias") {
      inicio.setDate(
        inicio.getDate() - 29
      );
    }

    return visitas.filter((visita) => {
      const fecha = new Date(visita.fecha);

      return (
        fecha >= inicio &&
        fecha <= ahora
      );
    });
  }, [visitas, periodoEstadisticas]);

  const totalVisitas = visitasPeriodo.filter(
    (v) => v.evento === "visita"
  ).length;

  const visitantesUnicos = new Set(
    visitasPeriodo
      .filter(
        (v) => v.evento === "visita"
      )
      .map((v) => v.session_id)
  ).size;

  const visitasCelular = visitasPeriodo.filter(
    (v) =>
      v.evento === "visita" &&
      v.dispositivo === "Celular"
  ).length;

  const visitasPC = visitasPeriodo.filter(
    (v) =>
      v.evento === "visita" &&
      v.dispositivo === "PC"
  ).length;

  const vistasProductoPeriodo =
    visitasPeriodo.filter(
      (v) => v.evento === "producto_visto"
    );

  const productosVistos =
    vistasProductoPeriodo.length;

  const personasQueVieronProductos =
    new Set(
      vistasProductoPeriodo.map(
        (v) => v.session_id
      )
    ).size;

  const agregadosCarrito = visitasPeriodo.filter(
    (v) => v.evento === "agregado_carrito"
  ).length;

  const checkouts = visitasPeriodo.filter(
    (v) => v.evento === "checkout"
  ).length;

  const pedidosPeriodo = useMemo(() => {
    const ahora = new Date();

    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);

    if (periodoEstadisticas === "7dias") {
      inicio.setDate(
        inicio.getDate() - 6
      );
    }

    if (periodoEstadisticas === "30dias") {
      inicio.setDate(
        inicio.getDate() - 29
      );
    }

    return pedidos.filter((pedido) => {
      const fecha = new Date(pedido.fecha);

      return (
        fecha >= inicio &&
        fecha <= ahora
      );
    });
  }, [pedidos, periodoEstadisticas]);

  const pedidosRegistrados = pedidosPeriodo.filter((pedido) => pedido.estado === "confirmado").length;

  const unidadesVendidas = pedidosPeriodo.filter((pedido) => pedido.estado === "confirmado").reduce((total, pedido) => total + (pedidoItems[pedido.id] || []).reduce((suma, item) => suma + Number(item.cantidad || 0), 0), 0);

  const facturacionPeriodo =
    pedidosPeriodo
      .filter(
        (pedido) =>
          pedido.estado === "confirmado"
      )
      .reduce(
        (total, pedido) =>
          total + Number(pedido.total || 0),
        0
      );

  const conversionVisitantePedido =
    visitantesUnicos > 0
      ? (pedidosRegistrados /
          visitantesUnicos) *
        100
      : 0;

  const tasaCarrito =
    visitantesUnicos > 0
      ? (agregadosCarrito /
          visitantesUnicos) *
        100
      : 0;

  const productosMasVistos = useMemo(() => {
    const mapa: Record<
      string,
      {
        vistas: number;
        personas: Set<string>;
      }
    > = {};

    vistasProductoPeriodo
      .filter(
        (v) =>
          v.producto_nombre
      )
      .forEach((v) => {
        const nombre =
          v.producto_nombre!;

        if (!mapa[nombre]) {
          mapa[nombre] = {
            vistas: 0,
            personas: new Set<string>(),
          };
        }

        mapa[nombre].vistas += 1;

        if (v.session_id) {
          mapa[nombre].personas.add(
            v.session_id
          );
        }
      });

    return Object.entries(mapa)
      .map(
        ([nombre, datos]) => ({
          nombre,
          vistas: datos.vistas,
          personas: datos.personas.size,
        })
      )
      .sort(
        (a, b) =>
          b.personas - a.personas ||
          b.vistas - a.vistas
      )
      .slice(0, 5);
  }, [vistasProductoPeriodo]);

  const productosMasVendidos = useMemo(() => {
    const mapa: Record<number, { nombre: string; unidades: number; facturacion: number }> = {};
    pedidosPeriodo.filter(p => p.estado === "confirmado").forEach(pedido => {
      (pedidoItems[pedido.id] || []).forEach(item => {
        if (!mapa[item.producto_id]) mapa[item.producto_id] = { nombre: item.nombre_producto, unidades: 0, facturacion: 0 };
        mapa[item.producto_id].unidades += Number(item.cantidad || 0);
        mapa[item.producto_id].facturacion += Number(item.subtotal || 0);
      });
    });
    return Object.values(mapa).sort((a,b) => b.unidades - a.unidades || b.facturacion - a.facturacion).slice(0, 5);
  }, [pedidosPeriodo, pedidoItems]);

  const fechasGrafico = useMemo(() => {
    const ahora = new Date();

    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);

    if (periodoEstadisticas === "7dias") {
      inicio.setDate(
        inicio.getDate() - 6
      );
    }

    if (periodoEstadisticas === "30dias") {
      inicio.setDate(
        inicio.getDate() - 29
      );
    }

    const resultado: {
      fecha: string;
      etiqueta: string;
      visitas: number;
    }[] = [];

    const cursor = new Date(inicio);

    while (cursor <= ahora) {
      const anio =
        cursor.getFullYear();

      const mes =
        String(
          cursor.getMonth() + 1
        ).padStart(2, "0");

      const dia =
        String(
          cursor.getDate()
        ).padStart(2, "0");

      const clave =
        `${anio}-${mes}-${dia}`;

      const cantidad =
        visitasPeriodo.filter(
          (v) => {
            if (
              v.evento !== "visita"
            ) {
              return false;
            }

            const fecha =
              new Date(v.fecha);

            return (
              fecha.getFullYear() ===
                anio &&
              fecha.getMonth() ===
                cursor.getMonth() &&
              fecha.getDate() ===
                cursor.getDate()
            );
          }
        ).length;

      resultado.push({
        fecha: clave,
        etiqueta:
          `${dia}/${mes}`,
        visitas: cantidad,
      });

      cursor.setDate(
        cursor.getDate() + 1
      );
    }

    return resultado;
  }, [visitasPeriodo, periodoEstadisticas]);

  const maxVisitasGrafico =
    Math.max(
      ...fechasGrafico.map(
        (d) => d.visitas
      ),
      1
    );

  const periodoTexto =
    periodoEstadisticas === "hoy"
      ? "Hoy"
      : periodoEstadisticas === "7dias"
      ? "Últimos 7 días"
      : "Últimos 30 días";

  // =========================
  // ESTILOS
  // =========================

  const inputStyle: React.CSSProperties =
    {
      width: "100%",
      padding: "11px 12px",
      border:
        "1px solid #d8ddd8",
      borderRadius: "8px",
      fontSize: "14px",
      boxSizing: "border-box",
      background: "#fff",
    };

  const labelStyle: React.CSSProperties =
    {
      display: "block",
      fontSize: "14px",
      fontWeight: 600,
      marginBottom: "6px",
      color: "#263d2d",
    };

  const buttonStyle: React.CSSProperties =
    {
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
          justifyContent:
            "center",
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
          justifyContent:
            "center",
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
              setEmail(
                e.target.value
              )
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
              setPassword(
                e.target.value
              )
            }
            placeholder="Tu contraseña"
            style={{
              ...inputStyle,
              marginBottom: "20px",
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                iniciarSesion();
              }
            }}
          />

          <button
            onClick={
              iniciarSesion
            }
            disabled={
              iniciandoSesion
            }
            style={{
              ...buttonStyle,
              width: "100%",
              background:
                "#263d2d",
              color: "#fff",
              opacity:
                iniciandoSesion
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

  function renderArbolCategorias(padreId: number, nivel = 1): any {
    return categorias.filter(c => c.parent_id === padreId).map(categoria => (
      <div key={categoria.id} style={{ marginLeft: `${nivel * 18}px`, marginTop: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: nivel % 2 ? "#f5f7f2" : "#fafbf8", border: "1px solid #e5e8e1", borderRadius: "8px" }}>
          <span style={{ flex: 1, color: "#444" }}>{"↳ ".repeat(Math.min(nivel, 3))}{categoria.nombre}</span>
          <button type="button" onClick={() => eliminarCategoriaJerarquica(categoria)} disabled={guardandoCategoria} style={{ border: "none", background: "#f1dede", color: "#9b3333", borderRadius: "6px", cursor: "pointer", padding: "5px 8px", fontWeight: 700 }}>Eliminar</button>
        </div>
        {renderArbolCategorias(categoria.id, nivel + 1)}
      </div>
    ));
  }

  const pedidosPendientes =
    pedidos.filter(
      (pedido) =>
        pedido.estado ===
        "pendiente"
    ).length;

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
            justifyContent:
              "space-between",
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
                margin:
                  "5px 0 0",
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
                setSeccionAbierta("productos");
                setMenuAbierto(false);
                setMostrarNuevo(
                  true
                );
                setEditando(
                  null
                );

                setNuevoProducto(
                  {
                    ...productoVacio,
                    talles: [],
                  }
                );

                setImagenesSeleccionadas(
                  []
                );
                setColoresPorTalle(
                  {}
                );
                setFotosPorColor(
                  {}
                );
                setPreciosPorColor(
                  {}
                );
                setFotosNuevasVariantes(
                  {}
                );
                setNuevoTalle(
                  ""
                );
                setNuevoColor(
                  ""
                );
                setTalleParaColor(
                  ""
                );
              }}
              style={{
                ...buttonStyle,
                background:
                  "#263d2d",
                color: "#fff",
              }}
            >
              + Nuevo producto
              
            </button>

            <button
              onClick={
                cerrarSesion
              }
              style={{
                ...buttonStyle,
                background:
                  "#fff",
                color:
                  "#263d2d",
                border:
                  "1px solid #263d2d",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* =========================
            MENÚ HAMBURGUESA
        ========================= */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-label="Abrir menú de administración"
            aria-expanded={menuAbierto}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "12px", padding: "14px 16px",
              borderRadius: "12px", border: "1px solid #d9dfd3", background: "#263d2d",
              color: "#fff", cursor: "pointer", fontSize: "16px", fontWeight: 700,
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px", lineHeight: 1 }}>☰</span>
              <span>Menú de administración</span>
            </span>
            <span>{menuAbierto ? "▲" : "▼"}</span>
          </button>

          {menuAbierto && (
            <div style={{
              position: "absolute", zIndex: 1000, top: "calc(100% + 8px)", left: 0, right: 0,
              background: "#fff", border: "1px solid #d9dfd3", borderRadius: "12px",
              padding: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}>
              {[
                { id: "productos" as const, icono: "📦", texto: "Productos" },
                { id: "categorias" as const, icono: "☰", texto: "Categorías y subcategorías" },
                { id: "pedidos" as const, icono: "🛒", texto: "Pedidos", contador: pedidosPendientes },
                { id: "estadisticas" as const, icono: "📊", texto: "Estadísticas" },
              ].map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => alternarSeccion(opcion.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 14px", border: "none", borderRadius: "9px",
                    background: seccionAbierta === opcion.id ? "#e5eadf" : "transparent",
                    color: "#263d2d", cursor: "pointer", textAlign: "left", fontSize: "15px",
                    fontWeight: seccionAbierta === opcion.id ? 700 : 500,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{opcion.icono}</span><span>{opcion.texto}</span>
                  </span>
                  {opcion.contador !== undefined && opcion.contador > 0 && (
                    <span style={{ minWidth: "24px", height: "24px", padding: "0 7px", borderRadius: "999px",
                      background: "#263d2d", color: "#fff", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                      {opcion.contador}
                    </span>
                  )}
                </button>
              ))}
              <div style={{ borderTop: "1px solid #eee", margin: "8px 0" }} />
              <button
                type="button"
                onClick={() => { setMenuAbierto(false); cerrarSesion(); }}
                style={{ width: "100%", padding: "13px 14px", border: "none", borderRadius: "9px",
                  background: "transparent", color: "#8a2d2d", cursor: "pointer", textAlign: "left",
                  fontSize: "15px", fontWeight: 600 }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* =========================
            CATEGORÍAS Y SUBCATEGORÍAS
        ========================= */}
        <div ref={categoriasRef} id="admin-categorias" style={{ display: seccionAbierta === "categorias" ? "block" : "none", scrollMarginTop: "24px" }}>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", marginBottom: "25px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: 0, color: "#263d2d" }}>Categorías y subcategorías</h2>
          <p style={{ margin: "5px 0 0", color: "#666", fontSize: "14px" }}>Creá categorías principales y después agregales todas las subcategorías que necesites.</p>
          {categorias.length === 0 && <div style={{ marginTop: "15px", padding: "12px 14px", background: "#fff7e6", border: "1px solid #ead7aa", borderRadius: "9px", color: "#6b571e", fontSize: "14px" }}>No hay categorías jerárquicas cargadas. Ejecutá primero <strong>LuckePet_migracion_supabase.sql</strong> en Supabase.</div>}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "15px" }}>
            <input value={nuevaCategoriaJerarquica} onChange={e => setNuevaCategoriaJerarquica(e.target.value)} onKeyDown={e => { if(e.key === "Enter") agregarCategoriaPrincipal(); }} placeholder="Nueva categoría principal" style={{ ...inputStyle, flex: 1, minWidth: "230px" }} disabled={guardandoCategoria} />
            <button type="button" onClick={agregarCategoriaPrincipal} disabled={guardandoCategoria} style={{ ...buttonStyle, background: "#263d2d", color: "#fff" }}>+ Categoría</button>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
            <select value={categoriaPadreNueva} onChange={e => setCategoriaPadreNueva(e.target.value ? Number(e.target.value) : "")} style={{ ...inputStyle, maxWidth: "300px" }} disabled={guardandoCategoria}>
              <option value="">Elegí categoría padre...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.parent_id === null ? c.nombre : `↳ ${c.nombre}`}</option>)}
            </select>
            <input value={nuevaSubcategoria} onChange={e => setNuevaSubcategoria(e.target.value)} onKeyDown={e => { if(e.key === "Enter") agregarCategoriaJerarquica(); }} placeholder="Nueva subcategoría" style={{ ...inputStyle, flex: 1, minWidth: "230px" }} disabled={guardandoCategoria} />
            <button type="button" onClick={agregarCategoriaJerarquica} disabled={guardandoCategoria} style={{ ...buttonStyle, background: "#e5eadf", color: "#263d2d" }}>+ Subcategoría</button>
          </div>
          <div style={{ marginTop: "18px" }}>
            {categorias.filter(c => c.parent_id === null).map(parent => (
              <div key={parent.id} style={{ border: "1px solid #dfe5db", borderRadius: "10px", padding: "10px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ flex: 1, color: "#263d2d" }}>{parent.nombre}</strong>
                  <button type="button" onClick={() => eliminarCategoriaJerarquica(parent)} disabled={guardandoCategoria} style={{ border: "none", background: "#f1dede", color: "#9b3333", borderRadius: "6px", cursor: "pointer", padding: "5px 8px", fontWeight: 700 }}>Eliminar</button>
                </div>
                {renderArbolCategorias(parent.id)}
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* =========================
            ESTADÍSTICAS
        ========================= */}

        <div ref={estadisticasRef} id="admin-estadisticas" style={{ display: seccionAbierta === "estadisticas" ? "block" : "none", scrollMarginTop: "24px" }}>
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
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#263d2d",
                }}
              >
                Estadísticas de la página
              </h2>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Tráfico, productos y comportamiento de tus clientes
              </p>
            </div>

            <button
              onClick={
                cargarEstadisticas
              }
              disabled={
                cargandoEstadisticas
              }
              style={{
                ...buttonStyle,
                background:
                  "#e5eadf",
                color:
                  "#263d2d",
              }}
            >
              {cargandoEstadisticas
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          {/* SELECTOR DE PERÍODO */}

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            {[
              {
                valor: "hoy" as PeriodoEstadisticas,
                texto: "Hoy",
              },
              {
                valor: "7dias" as PeriodoEstadisticas,
                texto: "Últimos 7 días",
              },
              {
                valor: "30dias" as PeriodoEstadisticas,
                texto: "Últimos 30 días",
              },
            ].map((opcion) => {
              const activo =
                periodoEstadisticas ===
                opcion.valor;

              return (
                <button
                  key={opcion.valor}
                  onClick={() =>
                    setPeriodoEstadisticas(
                      opcion.valor
                    )
                  }
                  style={{
                    ...buttonStyle,
                    background:
                      activo
                        ? "#263d2d"
                        : "#e5eadf",
                    color:
                      activo
                        ? "#fff"
                        : "#263d2d",
                  }}
                >
                  {opcion.texto}
                </button>
              );
            })}
          </div>

          {cargandoEstadisticas ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#666",
              }}
            >
              Cargando estadísticas...
            </div>
          ) : (
            <>
              {/* TARJETAS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                {[
                  {
                    titulo: "Visitantes únicos",
                    valor: visitantesUnicos,
                  },
                  {
                    titulo: "Visitas totales",
                    valor: totalVisitas,
                  },
                  {
                    titulo: "Desde celular",
                    valor: visitasCelular,
                  },
                  {
                    titulo: "Desde PC",
                    valor: visitasPC,
                  },
                  {
                    titulo: "Vistas de productos",
                    valor: productosVistos,
                  },
                  {
                    titulo: "Personas que vieron productos",
                    valor: personasQueVieronProductos,
                  },
                  {
                    titulo: "Agregados al carrito",
                    valor: agregadosCarrito,
                  },
                  {
                    titulo: "Checkouts",
                    valor: checkouts,
                  },
                  {
                    titulo: "Pedidos confirmados",
                    valor: pedidosRegistrados,
                  },
                  {
                    titulo: "Unidades vendidas",
                    valor: unidadesVendidas,
                  },
                  {
                    titulo: "Facturación",
                    valor: `$${facturacionPeriodo.toLocaleString(
                      "es-AR"
                    )}`,
                  },
                  {
                    titulo: "Conversión a pedido",
                    valor: `${conversionVisitantePedido.toFixed(
                      1
                    )}%`,
                  },
                  {
                    titulo: "Tasa de carrito",
                    valor: `${tasaCarrito.toFixed(
                      1
                    )}%`,
                  },
                ].map(
                  (estadistica) => (
                    <div
                      key={
                        estadistica.titulo
                      }
                      style={{
                        background:
                          "#f8f8f4",
                        borderRadius:
                          "10px",
                        padding:
                          "15px",
                        border:
                          "1px solid #e5e5df",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#666",
                          fontSize:
                            "13px",
                          marginBottom:
                            "6px",
                        }}
                      >
                        {
                          estadistica.titulo
                        }
                      </div>

                      <strong
                        style={{
                          color:
                            "#263d2d",
                          fontSize:
                            "23px",
                        }}
                      >
                        {
                          estadistica.valor
                        }
                      </strong>
                    </div>
                  )
                )}
              </div>

              <div style={{ background: "#f8f8f4", borderRadius: "10px", padding: "15px", marginBottom: "15px", border: "1px solid #e5e5df" }}>
                <h3 style={{ marginTop: 0, color: "#263d2d" }}>Productos más vendidos</h3>
                {productosMasVendidos.length === 0 ? <p style={{ color: "#777" }}>Todavía no hay ventas confirmadas en este período.</p> : productosMasVendidos.map((p, i) => (
                  <div key={`${p.nombre}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "9px 0", borderBottom: i < productosMasVendidos.length - 1 ? "1px solid #ddd" : "none" }}>
                    <span>{p.nombre}</span><strong>{p.unidades} u. · ${p.facturacion.toLocaleString("es-AR")}</strong>
                  </div>
                ))}
              </div>

              {/* GRÁFICO */}

              <div
                style={{
                  background:
                    "#f8f8f4",
                  borderRadius:
                    "10px",
                  padding:
                    "15px",
                  marginBottom:
                    "15px",
                  border:
                    "1px solid #e5e5df",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap:
                      "10px",
                    flexWrap:
                      "wrap",
                    marginBottom:
                      "15px",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin:
                          "0 0 4px",
                        color:
                          "#263d2d",
                      }}
                    >
                      Visitas por día
                    </h3>

                    <span
                      style={{
                        fontSize:
                          "13px",
                        color:
                          "#777",
                      }}
                    >
                      {periodoTexto}
                    </span>
                  </div>

                  <strong
                    style={{
                      color:
                        "#263d2d",
                    }}
                  >
                    {totalVisitas} visitas
                  </strong>
                </div>

                {fechasGrafico.length ===
                0 ? (
                  <p
                    style={{
                      color:
                        "#777",
                      textAlign:
                        "center",
                      padding:
                        "30px",
                    }}
                  >
                    Todavía no hay datos.
                  </p>
                ) : (
                  <div
                    style={{
                      width:
                        "100%",
                      overflowX:
                        "auto",
                    }}
                  >
                    <div
                      style={{
                        minWidth:
                          periodoEstadisticas ===
                          "30dias"
                            ? "700px"
                            : "100%",
                        height:
                          "250px",
                        position:
                          "relative",
                        padding:
                          "10px 5px 30px",
                        boxSizing:
                          "border-box",
                      }}
                    >
                      <svg
                        viewBox="0 0 1000 220"
                        preserveAspectRatio="none"
                        style={{
                          width:
                            "100%",
                          height:
                            "210px",
                          display:
                            "block",
                          overflow:
                            "visible",
                        }}
                      >
                        {/* LÍNEAS DE REFERENCIA */}

                        <line
                          x1="0"
                          y1="20"
                          x2="1000"
                          y2="20"
                          stroke="#ddd"
                          strokeWidth="1"
                        />

                        <line
                          x1="0"
                          y1="120"
                          x2="1000"
                          y2="120"
                          stroke="#ddd"
                          strokeWidth="1"
                        />

                        <line
                          x1="0"
                          y1="220"
                          x2="1000"
                          y2="220"
                          stroke="#ddd"
                          strokeWidth="1"
                        />

                        {/* BARRAS */}

                        {fechasGrafico.map(
                          (
                            dato,
                            index
                          ) => {
                            const ancho =
                              1000 /
                              fechasGrafico.length;

                            const altura =
                              dato.visitas /
                              maxVisitasGrafico *
                              180;

                            const x =
                              index *
                                ancho +
                              ancho *
                                0.2;

                            const y =
                              220 -
                              altura;

                            return (
                              <rect
                                key={
                                  dato.fecha
                                }
                                x={
                                  x
                                }
                                y={
                                  y
                                }
                                width={
                                  Math.max(
                                    ancho *
                                      0.6,
                                    2
                                  )
                                }
                                height={
                                  Math.max(
                                    altura,
                                    dato.visitas >
                                      0
                                      ? 2
                                      : 0
                                  )
                                }
                                rx="3"
                                fill="#263d2d"
                                opacity="0.85"
                              />
                            );
                          }
                        )}
                      </svg>

                      {/* ETIQUETAS */}

                      <div
                        style={{
                          position:
                            "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap:
                            "4px",
                          padding:
                            "0 5px",
                        }}
                      >
                        {fechasGrafico.map(
                          (
                            dato,
                            index
                          ) => {
                            const mostrar =
                              periodoEstadisticas ===
                              "30dias"
                                ? index %
                                    5 ===
                                    0 ||
                                  index ===
                                    fechasGrafico.length -
                                      1
                                : true;

                            return (
                              <span
                                key={
                                  dato.fecha
                                }
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    "#777",
                                  flex:
                                    1,
                                  textAlign:
                                    "center",
                                  visibility:
                                    mostrar
                                      ? "visible"
                                      : "hidden",
                                }}
                              >
                                {
                                  dato.etiqueta
                                }
                              </span>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PRODUCTOS + EMBUDO */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "15px",
                }}
              >
                {/* PRODUCTOS MÁS VISTOS */}

                <div
                  style={{
                    background:
                      "#f8f8f4",
                    borderRadius:
                      "10px",
                    padding:
                      "15px",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color:
                        "#263d2d",
                    }}
                  >
                    Productos más vistos
                  </h3>

                  <p
                    style={{
                      marginTop:
                        "-5px",
                      fontSize:
                        "12px",
                      color:
                        "#777",
                    }}
                  >
                    Ordenados por personas distintas
                  </p>

                  {productosMasVistos.length ===
                  0 ? (
                    <p
                      style={{
                        color:
                          "#777",
                      }}
                    >
                      Todavía no hay datos.
                    </p>
                  ) : (
                    productosMasVistos.map(
                      (
                        producto,
                        index
                      ) => (
                        <div
                          key={
                            producto.nombre
                          }
                          style={{
                            padding:
                              "10px 0",
                            borderBottom:
                              index <
                              productosMasVistos.length -
                                1
                                ? "1px solid #ddd"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap:
                                "10px",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#263d2d",
                              }}
                            >
                              {index +
                                1}
                              .{" "}
                              {
                                producto.nombre
                              }
                            </strong>

                            <strong
                              style={{
                                color:
                                  "#263d2d",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                producto.personas
                              }{" "}
                              personas
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "3px",
                              fontSize:
                                "12px",
                              color:
                                "#777",
                            }}
                          >
                            {
                              producto.vistas
                            }{" "}
                            vistas totales
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>

                {/* EMBUDO */}

                <div
                  style={{
                    background:
                      "#f8f8f4",
                    borderRadius:
                      "10px",
                    padding:
                      "15px",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color:
                        "#263d2d",
                    }}
                  >
                    Embudo de compra
                  </h3>

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap:
                        "9px",
                    }}
                  >
                    {[
                      {
                        nombre:
                          "Visitantes",
                        valor:
                          visitantesUnicos,
                      },
                      {
                        nombre:
                          "Vieron productos",
                        valor:
                          personasQueVieronProductos,
                      },
                      {
                        nombre:
                          "Agregaron al carrito",
                        valor:
                          agregadosCarrito,
                      },
                      {
                        nombre:
                          "Iniciaron checkout",
                        valor:
                          checkouts,
                      },
                      {
                        nombre:
                          "Hicieron pedido",
                        valor:
                          pedidosRegistrados,
                      },
                    ].map(
                      (paso) => (
                        <div
                          key={
                            paso.nombre
                          }
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            background:
                              "#fff",
                            borderRadius:
                              "8px",
                            padding:
                              "10px",
                          }}
                        >
                          <span
                            style={{
                              color:
                                "#555",
                              fontSize:
                                "13px",
                            }}
                          >
                            {
                              paso.nombre
                            }
                          </span>

                          <strong
                            style={{
                              color:
                                "#263d2d",
                            }}
                          >
                            {
                              paso.valor
                            }
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        </div>

        {/* =========================
            PEDIDOS
        ========================= */}

        <div ref={pedidosRef} id="admin-pedidos" style={{ display: seccionAbierta === "pedidos" ? "block" : "none", scrollMarginTop: "24px" }}>
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
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "15px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#263d2d",
                }}
              >
                Pedidos
              </h2>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                {pedidosPendientes}{" "}
                pendiente
                {pedidosPendientes !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            <button
              onClick={() => {
                setSeccionAbierta("productos");
                cargarPedidos();
                cargarProductos();
                cargarEstadisticas();
              }}
              disabled={
                cargandoPedidos
              }
              style={{
                ...buttonStyle,
                background:
                  "#e5eadf",
                color:
                  "#263d2d",
              }}
            >
              {cargandoPedidos
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          {cargandoPedidos ? (
            <div
              style={{
                padding: "25px",
                textAlign:
                  "center",
                color: "#666",
              }}
            >
              Cargando pedidos...
            </div>
          ) : pedidos.length ===
            0 ? (
            <div
              style={{
                padding: "25px",
                textAlign:
                  "center",
                color: "#777",
                background:
                  "#f8f8f4",
                borderRadius:
                  "10px",
              }}
            >
              No hay pedidos todavía.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "12px",
              }}
            >
              {pedidos.map(
                (pedido) => {
                  const items =
                    pedidoItems[
                      pedido.id
                    ] || [];

                  const abierto =
                    pedidoAbierto ===
                    pedido.id;

                  const procesando =
                    procesandoPedido ===
                    pedido.id;

                  return (
                    <div
                      key={
                        pedido.id
                      }
                      style={{
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "12px",
                        overflow:
                          "hidden",
                        background:
                          "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          padding:
                            "15px",
                          background:
                            "#fff",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap: "15px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "10px",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <strong
                                style={{
                                  color:
                                    "#263d2d",
                                  fontSize:
                                    "18px",
                                }}
                              >
                                Pedido #{pedido.id}
                              </strong>
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "8px",
                                fontSize:
                                  "13px",
                                color:
                                  "#555",
                              }}
                            >
                              <div>
                                <strong>
                                  Fecha:
                                </strong>{" "}
                                {new Date(
                                  pedido.fecha
                                ).toLocaleString(
                                  "es-AR"
                                )}
                              </div>

                              <div>
                                <strong>
                                  Cliente:
                                </strong>{" "}
                                {
                                  pedido.nombre
                                }{" "}
                                {
                                  pedido.apellido
                                }
                              </div>

                              <div>
                                <strong>
                                  Teléfono:
                                </strong>{" "}
                                {
                                  pedido.telefono
                                }
                              </div>

                              <div>
                                <strong>
                                  Email:
                                </strong>{" "}
                                {
                                  pedido.email
                                }
                              </div>

                              <div>
                                <strong>
                                  Dirección:
                                </strong>{" "}
                                {
                                  pedido.direccion
                                }
                              </div>

                              <div>
                                <strong>
                                  C.P.:
                                </strong>{" "}
                                {
                                  pedido.codigo_postal
                                }
                              </div>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "8px",
                                flexWrap:
                                  "wrap",
                                marginTop:
                                  "15px",
                              }}
                            >
                              <button
                                onClick={() =>
                                  setPedidoAbierto(
                                    abierto
                                      ? null
                                      : pedido.id
                                  )
                                }
                                style={{
                                  ...buttonStyle,
                                  background:
                                    "#e5eadf",
                                  color:
                                    "#263d2d",
                                }}
                              >
                                {abierto
                                  ? "Ocultar detalle"
                                  : "Ver detalle"}
                              </button>

                              {pedido.estado ===
                                "pendiente" && (
                                <>
                                  <button
                                    onClick={() =>
                                      confirmarPedido(
                                        pedido.id
                                      )
                                    }
                                    disabled={
                                      procesando
                                    }
                                    style={{
                                      ...buttonStyle,
                                      background:
                                        "#263d2d",
                                      color:
                                        "#fff",
                                      opacity:
                                        procesando
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {procesando
                                      ? "Procesando..."
                                      : "Confirmar"}
                                  </button>

                                  <button
                                    onClick={() =>
                                      cancelarPedido(
                                        pedido.id
                                      )
                                    }
                                    disabled={
                                      procesando
                                    }
                                    style={{
                                      ...buttonStyle,
                                      background:
                                        "#f1dede",
                                      color:
                                        "#9b3333",
                                      opacity:
                                        procesando
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {abierto && (
                            <div
                              style={{
                                borderTop:
                                  "1px solid #ddd",
                                padding:
                                  "15px",
                                background:
                                  "#f8f8f4",
                                width:
                                  "100%",
                                boxSizing:
                                  "border-box",
                              }}
                            >
                              <h3
                                style={{
                                  margin:
                                    "0 0 12px",
                                  color:
                                    "#263d2d",
                                  fontSize:
                                    "16px",
                                }}
                              >
                                Productos del pedido
                              </h3>

                              {items.length ===
                              0 ? (
                                <p
                                  style={{
                                    color:
                                      "#777",
                                    fontSize:
                                      "13px",
                                  }}
                                >
                                  No se encontraron
                                  productos
                                  para este
                                  pedido.
                                </p>
                              ) : (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    gap: "10px",
                                  }}
                                >
                                  {items.map(
                                    (item) => (
                                      <div
                                        key={
                                          item.id
                                        }
                                        style={{
                                          display:
                                            "flex",
                                          alignItems:
                                            "center",
                                          gap: "12px",
                                          background:
                                            "#fff",
                                          padding:
                                            "10px",
                                          borderRadius:
                                            "10px",
                                          border:
                                            "1px solid #e1e1e1",
                                        }}
                                      >
                                        <div
                                          style={{
                                            width:
                                              "65px",
                                            height:
                                              "65px",
                                            flexShrink:
                                              0,
                                            borderRadius:
                                              "8px",
                                            overflow:
                                              "hidden",
                                            background:
                                              "#eee",
                                            display:
                                              "flex",
                                            alignItems:
                                              "center",
                                            justifyContent:
                                              "center",
                                          }}
                                        >
                                          {item.imagen ? (
                                            <img
                                              src={
                                                item.imagen
                                              }
                                              alt={
                                                item.nombre_producto
                                              }
                                              style={{
                                                width:
                                                  "100%",
                                                height:
                                                  "100%",
                                                objectFit:
                                                  "cover",
                                              }}
                                            />
                                          ) : (
                                            <span
                                              style={{
                                                color:
                                                  "#999",
                                                fontSize:
                                                  "10px",
                                              }}
                                            >
                                              Sin imagen
                                            </span>
                                          )}
                                        </div>

                                        <div
                                          style={{
                                            flex: 1,
                                            minWidth:
                                              0,
                                          }}
                                        >
                                          <strong
                                            style={{
                                              color:
                                                "#263d2d",
                                              display:
                                                "block",
                                            }}
                                          >
                                            {
                                              item.nombre_producto
                                            }
                                          </strong>

                                          {(item.talle ||
                                            item.color) && (
                                            <p
                                              style={{
                                                margin:
                                                  "4px 0",
                                                fontSize:
                                                  "12px",
                                                color:
                                                  "#666",
                                              }}
                                            >
                                              {item.talle &&
                                                `Talle: ${item.talle}`}
                                              {item.talle &&
                                                item.color &&
                                                " • "}
                                              {item.color &&
                                                `Color: ${item.color}`}
                                            </p>
                                          )}

                                          <p
                                            style={{
                                              margin:
                                                0,
                                              fontSize:
                                                "13px",
                                              color:
                                                "#555",
                                            }}
                                          >
                                            Cantidad:{" "}
                                            {
                                              item.cantidad
                                            }{" "}
                                            × $
                                            {Number(
                                              item.precio_unitario
                                            ).toLocaleString(
                                              "es-AR"
                                            )}
                                          </p>
                                        </div>

                                        <strong
                                          style={{
                                            color:
                                              "#263d2d",
                                            whiteSpace:
                                              "nowrap",
                                          }}
                                        >
                                          $
                                          {Number(
                                            item.subtotal
                                          ).toLocaleString(
                                            "es-AR"
                                          )}
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "flex-end",
                                  marginTop:
                                    "15px",
                                  paddingTop:
                                    "12px",
                                  borderTop:
                                    "1px solid #ddd",
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize:
                                      "18px",
                                    color:
                                      "#263d2d",
                                  }}
                                >
                                  Total: $
                                  {Number(
                                    pedido.total
                                  ).toLocaleString(
                                    "es-AR"
                                  )}
                                </strong>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        </div>

        {/* =========================
            BUSCADOR
        ========================= */}

        <div ref={productosRef} id="admin-productos" style={{ display: seccionAbierta === "productos" ? "block" : "none", scrollMarginTop: "24px" }}>
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
              setBusqueda(
                e.target.value
              )
            }
            style={inputStyle}
          />
        </div>

        {/* =========================
            FORMULARIO NUEVO
        ========================= */}

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
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
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
                  setMostrarNuevo(
                    false
                  );
                  setImagenesSeleccionadas(
                    []
                  );
                  setColoresPorTalle(
                    {}
                  );
                  setFotosPorColor(
                    {}
                  );
                  setPreciosPorColor(
                    {}
                  );
                  setFotosNuevasVariantes(
                    {}
                  );
                }}
                style={{
                  ...buttonStyle,
                  background:
                    "#eee",
                  color:
                    "#333",
                }}
              >
                Cancelar
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "15px",
              }}
            >
              <div>
                <label
                  style={labelStyle}
                >
                  Nombre
                </label>

                <input
                  value={
                    nuevoProducto.name
                  }
                  onChange={(e) =>
                    setNuevoProducto(
                      {
                        ...nuevoProducto,
                        name:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Precio general
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    nuevoProducto.price
                  }
                  onChange={(e) =>
                    setNuevoProducto(
                      {
                        ...nuevoProducto,
                        price:
                          Number(
                            e.target
                              .value
                          ),
                      }
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Descuento (%)</label>
                <input type="number" min="0" max="100" step="1" value={nuevoProducto.descuento_porcentaje || 0} onChange={(e) => setNuevoProducto({ ...nuevoProducto, descuento_porcentaje: Number(e.target.value) })} style={inputStyle} />
                <small style={{ display: "block", marginTop: "5px", color: "#777" }}>Precio final: ${Math.round(Number(nuevoProducto.price || 0) * (1 - Number(nuevoProducto.descuento_porcentaje || 0) / 100)).toLocaleString("es-AR")}</small>
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    nuevoProducto.stock
                  }
                  onChange={(e) =>
                    setNuevoProducto(
                      {
                        ...nuevoProducto,
                        stock:
                          Number(
                            e.target
                              .value
                          ),
                      }
                    )
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                marginTop:
                  "15px",
              }}
            >
              <label
                style={labelStyle}
              >
                Descripción
              </label>

              <textarea
                value={
                  nuevoProducto.description
                }
                onChange={(e) =>
                  setNuevoProducto(
                    {
                      ...nuevoProducto,
                      description:
                        e.target
                          .value,
                    }
                  )
                }
                rows={4}
                style={{
                  ...inputStyle,
                  resize:
                    "vertical",
                }}
              />
            </div>

            <div
              style={{
                marginTop:
                  "20px",
              }}
            >
              <label
                style={labelStyle}
              >
                Categorías
              </label>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  flexWrap:
                    "wrap",
                }}
              >
                {categoriasDisponibles.map(
                  (categoria) => (
                    <label
                      key={
                        categoria
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "6px",
                        cursor:
                          "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={nuevoProducto.category.includes(
                          categoria
                        )}
                        onChange={() =>
                          setNuevoProducto(
                            {
                              ...nuevoProducto,
                              category:
                                alternarCategoria(
                                  nuevoProducto.category,
                                  categoria
                                ),
                            }
                          )
                        }
                      />

                      {
                        categoria
                      }
                    </label>
                  )
                )}
              </div>
            </div>

            <div
              style={{
                marginTop:
                  "20px",
              }}
            >
              <label
                style={labelStyle}
              >
                Imágenes generales
              </label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setImagenesSeleccionadas(
                    Array.from(
                      e.target
                        .files ||
                        []
                    )
                  )
                }
                style={inputStyle}
              />

              {imagenesSeleccionadas.length >
                0 && (
                <p
                  style={{
                    fontSize:
                      "13px",
                    color:
                      "#666",
                  }}
                >
                  {
                    imagenesSeleccionadas.length
                  }{" "}
                  imagen(es)
                  seleccionada(s)
                </p>
              )}
            </div>

            <div
              style={{
                marginTop:
                  "25px",
                paddingTop:
                  "20px",
                borderTop:
                  "1px solid #e5e5e5",
              }}
            >
              <label
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  cursor:
                    "pointer",
                  fontWeight:
                    600,
                  color:
                    "#263d2d",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    nuevoProducto.tiene_talle
                  }
                  onChange={(e) =>
                    setNuevoProducto(
                      {
                        ...nuevoProducto,
                        tiene_talle:
                          e.target
                            .checked,
                      }
                    )
                  }
                />

                Este producto tiene talles/colores
              </label>
            </div>

            {nuevoProducto.tiene_talle && (
              <div
                style={{
                  marginTop:
                    "20px",
                  padding:
                    "15px",
                  borderRadius:
                    "10px",
                  background:
                    "#f8f8f4",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color:
                      "#263d2d",
                  }}
                >
                  Talles y variantes
                </h3>

                <div
                  style={{
                    display:
                      "flex",
                    gap: "8px",
                    marginBottom:
                      "20px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <input
                    value={
                      nuevoTalle
                    }
                    onChange={(e) =>
                      setNuevoTalle(
                        e.target
                          .value
                      )
                    }
                    placeholder="Ej: S, M, L"
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth:
                        "180px",
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
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
                      background:
                        "#263d2d",
                      color:
                        "#fff",
                    }}
                  >
                    + Agregar talle
                  </button>
                </div>

                {nuevoProducto.talles.map(
                  (talle) => {
                    const colores =
                      coloresPorTalle[
                        talle
                      ] || [];

                    return (
                      <div
                        key={talle}
                        style={{
                          background:
                            "#fff",
                          borderRadius:
                            "10px",
                          padding:
                            "15px",
                          marginBottom:
                            "15px",
                          border:
                            "1px solid #e1e1e1",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap: "10px",
                            marginBottom:
                              "12px",
                          }}
                        >
                          <strong
                            style={{
                              color:
                                "#263d2d",
                              fontSize:
                                "16px",
                            }}
                          >
                            Talle:{" "}
                            {talle}
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
                              color:
                                "#9b3333",
                              padding:
                                "7px 10px",
                            }}
                          >
                            Eliminar talle
                          </button>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                            marginBottom:
                              "15px",
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
                                e.target
                                  .value
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
                              color:
                                "#263d2d",
                            }}
                          >
                            + Agregar color
                          </button>
                        </div>

                        {colores.map(
                          (color) => {
                            const clave =
                              clavePrecioNuevo(
                                talle,
                                color
                              );

                            const fotos =
                              fotosPorColor[
                                clave
                              ] || [];

                            const precioActual =
                              preciosPorColor[
                                clave
                              ] ??
                              nuevoProducto.price;

                            return (
                              <div
                                key={
                                  clave
                                }
                                style={{
                                  border:
                                    "1px solid #ddd",
                                  borderRadius:
                                    "8px",
                                  padding:
                                    "12px",
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
                                  🎨{" "}
                                  {color}
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
                                    Precio de esta combinación
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      precioActual
                                    }
                                    onChange={(
                                      e
                                    ) => {
                                      const precio =
                                        Number(
                                          e
                                            .target
                                            .value
                                        );

                                      setPreciosPorColor(
                                        (
                                          actuales
                                        ) => ({
                                          ...actuales,
                                          [clave]:
                                            precio,
                                        })
                                      );
                                    }}
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
                                    Fotos de esta combinación
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
                                          e
                                            .target
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
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                marginTop:
                  "20px",
              }}
            >
              <button
                onClick={
                  crearProducto
                }
                disabled={
                  guardando ||
                  subiendoImagen
                }
                style={{
                  ...buttonStyle,
                  background:
                    "#263d2d",
                  color:
                    "#fff",
                  padding:
                    "12px 22px",
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
              background:
                "#fff",
              borderRadius:
                "12px",
              padding:
                "30px",
              textAlign:
                "center",
              color:
                "#666",
            }}
          >
            Cargando productos...
          </div>
        ) : productosFiltrados.length ===
          0 ? (
          <div
            style={{
              background:
                "#fff",
              borderRadius:
                "12px",
              padding:
                "30px",
              textAlign:
                "center",
              color:
                "#666",
            }}
          >
            No se encontraron productos.
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap:
                "18px",
            }}
          >
            {productosFiltrados.map(
              (producto) => {
                return (
                  <div
                    key={
                      producto.id
                    }
                    draggable={!busqueda.trim()}
                  onDragStart={(e) => {
  if (busqueda.trim()) return;

  setProductoArrastrado(producto.id);

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData(
    "text/plain",
    String(producto.id)
  );
}}

onDragOver={(e) => {
  if (busqueda.trim()) return;

  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}}

onDrop={(e) => {
  e.preventDefault();

  if (busqueda.trim()) return;

  const idArrastrado = Number(
    e.dataTransfer.getData("text/plain")
  );

  if (!idArrastrado) return;

  setProductoArrastrado(idArrastrado);

  void reordenarProductos(producto.id);
}}

onDragEnd={() => {
  setProductoArrastrado(null);
}}
                    title={!busqueda.trim() ? "Arrastrá para cambiar el orden" : "Quitá la búsqueda para ordenar"}
                    style={{
                      background:
                        "#fff",
                      borderRadius:
                        "14px",
                      overflow:
                        "hidden",
                      boxShadow:
                        "0 4px 15px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        height:
                          "165px",
                        background:
                          "#f5f5f5",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        overflow:
                          "hidden",
                      }}
                    >
                      {producto.image ? (
                        <img
                          src={
                            producto.image
                          }
                          alt={
                            producto.name
                          }
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color:
                              "#999",
                          }}
                        >
                          Sin imagen
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        padding:
                          "15px",
                      }}
                    >
                      <h3
                        style={{
                          margin:
                            "0 0 8px",
                          color:
                            "#263d2d",
                        }}
                      >
                        {
                          producto.name
                        }
                      </h3>

                      <p
                        style={{
                          margin:
                            "0 0 5px",
                          fontWeight:
                            700,
                        }}
                      >
                        $
                        {Number(
                          producto.price
                        ).toLocaleString(
                          "es-AR"
                        )}
                      </p>

                      <p
                        style={{
                          margin:
                            "0 0 10px",
                          fontSize:
                            "13px",
                          color:
                            "#666",
                        }}
                      >
                        Stock:{" "}
                        {
                          producto.stock
                        }
                      </p>

                      {producto.category &&
                        producto.category.length >
                          0 && (
                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "5px",
                              flexWrap:
                                "wrap",
                              marginBottom:
                                "12px",
                            }}
                          >
                            {producto.category.map(
                              (
                                categoria
                              ) => (
                                <span
                                  key={
                                    categoria
                                  }
                                  style={{
                                    background:
                                      "#e5eadf",
                                    color:
                                      "#263d2d",
                                    padding:
                                      "4px 8px",
                                    borderRadius:
                                      "20px",
                                    fontSize:
                                      "11px",
                                  }}
                                >
                                  {
                                    categoria
                                  }
                                </span>
                              )
                            )}
                          </div>
                        )}

                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            abrirEdicion(
                              producto
                            )
                          }
                          style={{
                            ...buttonStyle,
                            flex: 1,
                            background:
                              "#263d2d",
                            color:
                              "#fff",
                          }}
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            eliminarProducto(
                              producto.id
                            )
                          }
                          style={{
                            ...buttonStyle,
                            background:
                              "#f1dede",
                            color:
                              "#9b3333",
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        </div>

        {/* =========================
            MODAL EDITAR PRODUCTO
        ========================= */}

        {editando && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              zIndex:
                9999,
              background:
                "rgba(0,0,0,0.55)",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding:
                "15px",
              boxSizing:
                "border-box",
              overflowY:
                "auto",
            }}
          >
            <div
              style={{
                width:
                  "100%",
                maxWidth:
                  "800px",
                maxHeight:
                  "95vh",
                overflowY:
                  "auto",
                background:
                  "#fff",
                borderRadius:
                  "14px",
                padding:
                  "20px",
                boxSizing:
                  "border-box",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "20px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color:
                      "#263d2d",
                  }}
                >
                  Editar producto
                </h2>

                <button
                  onClick={
                    cancelarEdicion
                  }
                  style={{
                    ...buttonStyle,
                    background:
                      "#eee",
                    color:
                      "#333",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* DATOS BÁSICOS */}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap:
                    "15px",
                }}
              >
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Nombre
                  </label>

                  <input
                    value={
                      editando.name
                    }
                    onChange={(
                      e
                    ) =>
                      setEditando(
                        {
                          ...editando,
                          name:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Precio general
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      editando.price
                    }
                    onChange={(
                      e
                    ) =>
                      setEditando(
                        {
                          ...editando,
                          price:
                            Number(
                              e.target
                                .value
                            ),
                        }
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      editando.stock
                    }
                    onChange={(
                      e
                    ) =>
                      setEditando(
                        {
                          ...editando,
                          stock:
                            Number(
                              e.target
                                .value
                            ),
                        }
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    "15px",
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Descripción
                </label>

                <textarea
                  value={
                    editando.description ||
                    ""
                  }
                  onChange={(
                    e
                  ) =>
                    setEditando(
                      {
                        ...editando,
                        description:
                          e.target
                            .value,
                      }
                    )
                  }
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize:
                      "vertical",
                  }}
                />
              </div>

              {/* CATEGORÍAS */}

              <div
                style={{
                  marginTop:
                    "20px",
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Categorías
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "15px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  {categoriasDisponibles.map(
                    (
                      categoria
                    ) => (
                      <label
                        key={
                          categoria
                        }
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "6px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(
                            editando.category ||
                            []
                          ).includes(
                            categoria
                          )}
                          onChange={() =>
                            setEditando(
                              {
                                ...editando,
                                category:
                                  alternarCategoria(
                                    editando.category ||
                                      [],
                                    categoria
                                  ),
                              }
                            )
                          }
                        />

                        {
                          categoria
                        }
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* IMÁGENES GENERALES */}

              <div
                style={{
                  marginTop:
                    "20px",
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Imágenes actuales
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "10px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  {(
                    imagenesProducto[
                      editando.id
                    ] || []
                  ).sort(
                    (a, b) => Number(a.orden) - Number(b.orden) || (a.id || 0) - (b.id || 0)
                  ).map(
                    (imagen) => (
                      <div
                        key={
                          imagen.id
                        }
                        draggable
                        onDragStart={() => {
                          if (imagen.id) setImagenArrastrada(imagen.id);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (imagen.id) void reordenarImagenes(editando.id, imagen.id);
                        }}
                        onDragEnd={() => setImagenArrastrada(null)}
                        title="Arrastrá para cambiar el orden"
                        style={{
                          width:
                            "100px",
                          position:
                            "relative",
                        }}
                      >
                        <img
                          src={
                            imagen.image_url
                          }
                          alt=""
                          style={{
                            width:
                              "100px",
                            height:
                              "100px",
                            objectFit:
                              "cover",
                            borderRadius:
                              "8px",
                            border:
                              editando.image ===
                              imagen.image_url
                                ? "3px solid #263d2d"
                                : "1px solid #ddd",
                          }}
                        />

                        <button
                          onClick={() =>
                            eliminarImagen(
                              imagen
                            )
                          }
                          style={{
                            position:
                              "absolute",
                            top:
                              "4px",
                            right:
                              "4px",
                            width:
                              "24px",
                            height:
                              "24px",
                            border:
                              "none",
                            borderRadius:
                              "50%",
                            background:
                              "#fff",
                            color:
                              "#a00",
                            cursor:
                              "pointer",
                            fontWeight:
                              700,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(
                    e
                  ) =>
                    setImagenesSeleccionadas(
                      Array.from(
                        e.target
                          .files ||
                          []
                      )
                    )
                  }
                  style={{
                    ...inputStyle,
                    marginTop:
                      "12px",
                  }}
                />

                {imagenesSeleccionadas.length >
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
                      imagenesSeleccionadas.length
                    }{" "}
                    imagen(es)
                    nueva(s)
                    seleccionada(s).
                  </p>
                )}
              </div>

              {/* TIENE TALLE */}

              <div
                style={{
                  marginTop:
                    "25px",
                  paddingTop:
                    "20px",
                  borderTop:
                    "1px solid #e5e5e5",
                }}
              >
                <div style={{ marginBottom: "10px", color: "#666", fontSize: "13px" }}>Arrastrá las imágenes para ponerlas en el orden que quieras.</div>

                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                    fontWeight:
                      600,
                    color:
                      "#263d2d",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      editando.tiene_talle
                    }
                    onChange={(
                      e
                    ) =>
                      setEditando(
                        {
                          ...editando,
                          tiene_talle:
                            e.target
                              .checked,
                        }
                      )
                    }
                  />

                  Este producto tiene talles/colores
                </label>
              </div>

              {/* VARIANTES */}

              {editando.tiene_talle && (
                <div
                  style={{
                    marginTop:
                      "20px",
                    background:
                      "#f8f8f4",
                    padding:
                      "15px",
                    borderRadius:
                      "10px",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color:
                        "#263d2d",
                    }}
                  >
                    Talles y variantes
                  </h3>

                  {/* AGREGAR TALLE */}

                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "8px",
                      flexWrap:
                        "wrap",
                      marginBottom:
                        "20px",
                    }}
                  >
                    <input
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
                      placeholder="Ej: S, M, L"
                      style={{
                        ...inputStyle,
                        flex: 1,
                        minWidth:
                          "180px",
                      }}
                    />

                    <button
                      onClick={
                        agregarTalleEditando
                      }
                      style={{
                        ...buttonStyle,
                        background:
                          "#263d2d",
                        color:
                          "#fff",
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
                            v.talle ===
                              talle
                        );

                      return (
                        <div
                          key={
                            talle
                          }
                          style={{
                            background:
                              "#fff",
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "10px",
                            padding:
                              "15px",
                            marginBottom:
                              "15px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              marginBottom:
                                "12px",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#263d2d",
                              }}
                            >
                              Talle:{" "}
                              {
                                talle
                              }
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
                                color:
                                  "#9b3333",
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
                              display:
                                "flex",
                              gap:
                                "8px",
                              flexWrap:
                                "wrap",
                              marginBottom:
                                "12px",
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
                              onChange={(
                                e
                              ) => {
                                setTalleParaColor(
                                  talle
                                );
                                setNuevoColor(
                                  e
                                    .target
                                    .value
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
                                color:
                                  "#263d2d",
                              }}
                            >
                              + Agregar color
                            </button>
                          </div>

                          {/* COLORES */}

                          {variantesDelTalle.map(
                            (
                              variante
                            ) => {
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
                                    padding:
                                      "12px",
                                    marginTop:
                                      "10px",
                                    background:
                                      "#fafafa",
                                  }}
                                >
                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      justifyContent:
                                        "space-between",
                                      alignItems:
                                        "center",
                                      gap:
                                        "10px",
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
                                      Precio de esta combinación
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        variante.precio
                                      }
                                      onChange={(
                                        e
                                      ) => {
                                        const precio =
                                          Number(
                                            e
                                              .target
                                              .value
                                          );

                                        setVariantes(
                                          (
                                            actuales
                                          ) =>
                                            actuales.map(
                                              (
                                                v
                                              ) =>
                                                (
                                                  (v.id &&
                                                    variante.id &&
                                                    v.id ===
                                                      variante.id) ||
                                                  v ===
                                                    variante
                                                )
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
                                          gap:
                                            "8px",
                                          flexWrap:
                                            "wrap",
                                        }}
                                      >
                                        {fotos.map(
                                          (
                                            foto
                                          ) => (
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
                                      Agregar fotos para esta combinación
                                    </label>

                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(
                                        e
                                      ) =>
                                        seleccionarFotosVariante(
                                          variante,
                                          Array.from(
                                            e
                                              .target
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
                                color:
                                  "#777",
                                fontSize:
                                  "13px",
                              }}
                            >
                              No hay colores para este talle todavía.
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
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap:
                    "10px",
                  marginTop:
                    "25px",
                  paddingTop:
                    "20px",
                  borderTop:
                    "1px solid #e5e5e5",
                }}
              >
                <button
                  onClick={
                    cancelarEdicion
                  }
                  disabled={
                    guardando
                  }
                  style={{
                    ...buttonStyle,
                    background:
                      "#eee",
                    color:
                      "#333",
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={
                    guardarCambios
                  }
                  disabled={
                    guardando ||
                    subiendoImagen
                  }
                  style={{
                    ...buttonStyle,
                    background:
                      "#263d2d",
                    color:
                      "#fff",
                    padding:
                      "12px 22px",
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