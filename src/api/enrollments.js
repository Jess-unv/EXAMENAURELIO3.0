// src/api/orders.js - VERSIÓN ACTUALIZADA
import { supabase } from '../utils/supabase';

export const ordersAPI = {
  // Generar número de pedido único
  generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}${month}${day}-${random}`;
  },

  // Crear un nuevo pedido - VERSIÓN MEJORADA
  async createOrder(orderData, items) {
    try {
      console.log('Creando pedido con datos:', { 
        orderData, 
        itemsCount: items.length,
        clientId: orderData.client_id,
        providerId: orderData.provider_id
      });

      // 1. Generar número de pedido único
      const orderNumber = this.generateOrderNumber();
      console.log('Número de pedido generado:', orderNumber);

      // 2. Crear el pedido en la tabla orders
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          client_id: orderData.client_id,
          provider_id: orderData.provider_id,
          total: orderData.total,
          shipping_address: orderData.shipping_address,
          status: 'pending',
          payment_status: orderData.payment_status || 'paid',
          payment_method: orderData.payment_method || 'manual',
          stripe_payment_id: orderData.stripe_payment_id || null,
          cancelable_until: new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString(), // 15 horas
          notes: orderData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (orderError) {
        console.error('Error creando pedido en orders:', orderError);
        throw new Error(`Error creando pedido: ${orderError.message}`);
      }

      console.log('Pedido creado en orders:', order.id);

      // 3. Verificar que los items tengan datos necesarios
      const orderItems = items.map(item => {
        if (!item.id) {
          throw new Error(`Producto sin ID: ${item.name}`);
        }
        if (!item.price) {
          throw new Error(`Producto sin precio: ${item.name}`);
        }
        
        const quantity = item.quantity || 1;
        const unitPrice = parseFloat(item.price);
        
        return {
          order_id: order.id,
          product_id: item.id,
          quantity: quantity,
          unit_price: unitPrice,
          subtotal: unitPrice * quantity,
          created_at: new Date().toISOString()
        };
      });

      console.log('Creando items del pedido:', orderItems.length);

      // 4. Insertar items del pedido
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creando order_items:', itemsError);
        throw new Error(`Error creando items del pedido: ${itemsError.message}`);
      }

      console.log('Order_items creados exitosamente');

      // 5. Reducir stock de productos (solo si hay stock disponible)
      console.log('Reduciendo stock de productos...');
      for (const item of items) {
        try {
          // Primero obtener el stock actual
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();

          if (product) {
            const newStock = Math.max(0, product.stock - (item.quantity || 1));
            
            const { error: stockError } = await supabase
              .from('products')
              .update({ 
                stock: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);

            if (stockError) {
              console.error(`Error actualizando stock del producto ${item.id}:`, stockError);
              // Continuamos con el siguiente producto, no detenemos el proceso
            } else {
              console.log(`Stock actualizado para producto ${item.id}: ${product.stock} -> ${newStock}`);
            }
          } else {
            console.warn(`Producto ${item.id} no encontrado, no se puede actualizar stock`);
          }
        } catch (stockErr) {
          console.error(`Error procesando stock para producto ${item.id}:`, stockErr);
          // Continuamos con el siguiente producto
        }
      }

      // 6. Obtener el pedido completo con relaciones
      const { data: completeOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (*)
          ),
          provider:users!orders_provider_id_fkey(name, email),
          client:users!orders_client_id_fkey(name, email, phone)
        `)
        .eq('id', order.id)
        .single();

      if (fetchError) {
        console.error('Error obteniendo pedido completo:', fetchError);
        // Devolvemos el pedido básico si no podemos obtener las relaciones
        return { 
          success: true, 
          order: {
            ...order,
            order_number: orderNumber
          } 
        };
      }

      return { 
        success: true, 
        order: completeOrder,
        message: `Pedido ${orderNumber} creado exitosamente`
      };
    } catch (error) {
      console.error('Error en createOrder:', error);
      return { 
        success: false, 
        error: error.message || 'Error desconocido al crear pedido',
        details: error.details || null
      };
    }
  },

  // Obtener pedidos del cliente
  async getClientOrders(clientId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (*)
          ),
          provider:users!orders_provider_id_fkey(name, email, phone)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Formatear los datos para mayor consistencia
      const formattedOrders = (data || []).map(order => ({
        ...order,
        orderId: order.order_number || order.id,
        orderNumber: order.order_number,
        total: parseFloat(order.total) || 0,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: (order.order_items || []).map(item => ({
          ...item,
          product: item.products ? {
            id: item.products.id,
            name: item.products.name,
            price: parseFloat(item.products.price) || 0,
            images: item.products.images || [],
            description: item.products.description || '',
            providerId: item.products.provider_id
          } : null
        })),
        provider: order.provider ? {
          name: order.provider.name,
          email: order.provider.email,
          phone: order.provider.phone
        } : null
      }));
      
      return formattedOrders;
    } catch (error) {
      console.error('Error en getClientOrders:', error);
      throw error;
    }
  },

  // Obtener pedidos del proveedor
  async getProviderOrders(providerId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (*)
          ),
          client:users!orders_client_id_fkey(name, email, phone, address)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Formatear los datos para mayor consistencia
      const formattedOrders = (data || []).map(order => ({
        ...order,
        orderId: order.order_number || order.id,
        orderNumber: order.order_number,
        total: parseFloat(order.total) || 0,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: (order.order_items || []).map(item => ({
          ...item,
          product: item.products ? {
            id: item.products.id,
            name: item.products.name,
            price: parseFloat(item.products.price) || 0,
            images: item.products.images || []
          } : null
        })),
        client: order.client ? {
          name: order.client.name,
          email: order.client.email,
          phone: order.client.phone,
          address: order.client.address
        } : null
      }));
      
      return formattedOrders;
    } catch (error) {
      console.error('Error en getProviderOrders:', error);
      throw error;
    }
  },

  // Obtener pedido por ID
  async getOrderById(orderId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (*)
          ),
          provider:users!orders_provider_id_fkey(name, email, phone),
          client:users!orders_client_id_fkey(name, email, phone, address)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      return {
        success: true,
        order: {
          ...data,
          orderNumber: data.order_number,
          total: parseFloat(data.total) || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          items: (data.order_items || []).map(item => ({
            ...item,
            product: item.products ? {
              id: item.products.id,
              name: item.products.name,
              price: parseFloat(item.products.price) || 0,
              images: item.products.images || [],
              description: item.products.description || ''
            } : null
          })),
          provider: data.provider ? {
            name: data.provider.name,
            email: data.provider.email,
            phone: data.provider.phone
          } : null,
          client: data.client ? {
            name: data.client.name,
            email: data.client.email,
            phone: data.client.phone,
            address: data.client.address
          } : null
        }
      };
    } catch (error) {
      console.error('Error en getOrderById:', error);
      return { 
        success: false, 
        error: error.message || 'Error obteniendo pedido' 
      };
    }
  },

  // Actualizar estado del pedido
  async updateOrderStatus(orderId, status) {
    try {
      // Validar que el estado sea válido
      const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
      }

      const { data, error } = await supabase
        .from('orders')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      
      return { 
        success: true, 
        order: data,
        message: `Estado actualizado a: ${status}`
      };
    } catch (error) {
      console.error('Error en updateOrderStatus:', error);
      return { 
        success: false, 
        error: error.message || 'Error actualizando estado del pedido' 
      };
    }
  },

  // Cancelar pedido
  async cancelOrder(orderId, reason = '') {
    try {
      // 1. Obtener el pedido actual
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw new Error('Pedido no encontrado');

      // 2. Verificar si es cancelable
      const now = new Date();
      const cancelableUntil = new Date(order.cancelable_until);

      if (now > cancelableUntil) {
        throw new Error('El tiempo para cancelar ha expirado (15 horas)');
      }

      if (!['pending', 'paid'].includes(order.status)) {
        throw new Error('Solo puedes cancelar pedidos pendientes o pagados');
      }

      // 3. Actualizar estado del pedido
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 4. Restaurar stock de productos
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (items && items.length > 0) {
        for (const item of items) {
          try {
            await supabase
              .from('products')
              .update({ 
                stock: supabase.raw('stock + ?', [item.quantity]),
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id);
          } catch (stockErr) {
            console.error(`Error restaurando stock para producto ${item.product_id}:`, stockErr);
            // Continuamos aunque haya error en un producto
          }
        }
      }

      return { 
        success: true, 
        order: data,
        message: 'Pedido cancelado exitosamente'
      };
    } catch (error) {
      console.error('Error en cancelOrder:', error);
      return { 
        success: false, 
        error: error.message || 'Error cancelando el pedido' 
      };
    }
  },

  // Suscribirse a cambios en tiempo real
  subscribeToOrders(userId, userRole, callback) {
    try {
      const channel = supabase
        .channel(`orders-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: userRole === 'provider' 
              ? `provider_id=eq.${userId}`
              : `client_id=eq.${userId}`
          },
          (payload) => {
            console.log('Cambio en tiempo real detectado:', payload);
            callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`Suscripción a pedidos: ${status}`);
        });

      // Devolver función para desuscribirse
      return () => {
        console.log('Desuscribiendo de cambios en pedidos');
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error suscribiéndose a cambios:', error);
      return () => {}; // Función vacía por si hay error
    }
  }
};