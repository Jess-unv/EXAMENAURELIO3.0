// src/mocks/data.js

// Productos generales disponibles (para clientes)
export const mockProducts = [
  {
    id: 1,
    name: "Tacos de Asada",
    price: 45,
    description: "3 tacos con guacamole",
    image: "🌮",
    providerId: 1,
    providerName: "Taquería El Primo",
  },
  {
    id: 2,
    name: "Burrito Supremo",
    price: 98,
    description: "Frijoles, arroz, carne, queso",
    image: "🌯",
    providerId: 1,
    providerName: "Taquería El Primo",
  },
  {
    id: 3,
    name: "Agua Fresca Grande",
    price: 35,
    description: "Jamaica / Horchata / Tamarindo",
    image: "🥤",
    providerId: 2,
    providerName: "Bebidas Naturales Lupe",
  },
  {
    id: 4,
    name: "Quesadilla Grande",
    price: 65,
    description: "Con chicharrón prensado",
    image: "🧀",
    providerId: 1,
    providerName: "Taquería El Primo",
  },
  {
    id: 5,
    name: "Combo Familiar",
    price: 320,
    description: "8 tacos + 4 aguas + guacamole",
    image: "👨‍👩‍👧‍👦",
    providerId: 1,
    providerName: "Taquería El Primo",
  },
];

// Órdenes simuladas del cliente
export const mockOrders = [
  {
    id: 1001,
    productId: 1,
    productName: "Tacos de Asada",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // hace 15 min
    total: 45,
    clientId: "client-001",
  },
  {
    id: 1002,
    productId: 3,
    productName: "Agua Fresca Grande",
    status: "paid",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // hace 45 min
    total: 35,
    clientId: "client-001",
  },
];

// Productos que pertenecen a diferentes proveedores
export const mockMyProducts = (providerId) => {
  const allProducts = [
    {
      id: 101,
      providerId: 1,
      name: "Auriculares Inalámbricos Pro",
      price: 899,
      description: "Cancelación de ruido, 30h batería",
      category: "Electrónica",
      image: "🎧",
      stock: 12,
    },
    {
      id: 106,
      providerId: 1,
      name: "Cargador Rápido 65W",
      price: 449,
      description: "PD 3.0 + GaN, varios colores",
      category: "Electrónica",
      image: "🔌",
      stock: 8,
    },
    {
      id: 107,
      providerId: 1,
      name: "Mouse Gamer RGB",
      price: 599,
      description: "16000 DPI, 8 botones programables",
      category: "Electrónica",
      image: "🖱️",
      stock: 5,
    },
    {
      id: 201,
      providerId: 2,
      name: "Collar de Turquesa Artesanal",
      price: 320,
      description: "Hecho a mano en Baja California",
      category: "Artesanías",
      image: "📿",
      stock: 4,
    },
  ];

  return allProducts.filter((p) => p.providerId === providerId);
};

// Pedidos dirigidos a un proveedor específico
export const mockProviderOrders = (providerId) => [
  {
    id: 2001,
    productId: 101,
    productName: "Auriculares Inalámbricos Pro",
    clientName: "Ana López",
    clientId: "client-001",
    status: "pending",
    total: 899,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 2002,
    productId: 106,
    productName: "Cargador Rápido 65W",
    clientName: "Carlos Ramírez",
    clientId: "client-002",
    status: "paid",
    total: 449,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

// Usuarios simulados para login (¡esto es lo nuevo!)
export const mockUsers = [
  {
    id: "client-001",
    email: "cliente1@example.com",
    password: "123456",
    name: "Juan Pérez",
    role: "client",
    createdAt: new Date().toISOString(),
  },
  {
    id: "provider-001",
    email: "proveedor1@example.com",
    password: "123456",
    name: "María López - Tienda Tech",
    role: "provider",
    createdAt: new Date().toISOString(),
  },
  {
    id: "client-002",
    email: "ana.lopez@gmail.com",
    password: "abc123",
    name: "Ana López",
    role: "client",
    createdAt: new Date().toISOString(),
  },
  // Puedes agregar más usuarios aquí...
];
