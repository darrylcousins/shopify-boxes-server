const models = require('../../db/models');
const { LABELKEYS, numberedStringToHandle, listOfToArray, getTotalPrice, getQuantities } = require('./lib');

const orderCreate = async (webhook) => {
  const [delivery_date, p_in, p_add, p_dislikes, subscribed, addprod] = LABELKEYS;

  const payload = webhook.payload;
  //console.log('Received Create Order:', JSON.stringify(payload, null, 2));
  let box_map = new Map();
  let produce_map = new Map();

  // if line item quantity is 2 or more then will be picked up when printing labels
  payload.line_items.forEach(item => {
    var attrs = item.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
      {});
    if (delivery_date in attrs && p_in in attrs && p_add in attrs) {
      // we have a veggie box
      const subscription = subscribed in attrs ? attrs[subscribed] : null;
      const delivery = attrs[delivery_date];

      let key = `${delivery}::${item.title}`;
      box_map.set(key, {
        subscription,
        quantity: item.quantity,
        shopify_product_id: item.product_id,
        shopify_variant_id: item.variant_id,
        line_item_id: item.id,
        price: parseInt(parseFloat(item.price) * 100),
        including: attrs[p_in],
        addons: attrs[p_add],
        dislikes: attrs[p_dislikes],
      });
    };
    if (delivery_date in attrs && addprod in attrs) {
      // we have an add in product
      const delivered = attrs[delivery_date];
      let key = `${delivered}::${attrs[addprod]}`;

      const tempProduct = {
        box_product_name: attrs[addprod],
        handle: numberedStringToHandle(item.title),
        shopify_variant_id: item.variant_id,
        shopify_product_id: item.product_id,
        price: parseInt(parseFloat(item.price) * 100),
        quantity: item.quantity,
      };
      if (produce_map.has(key)) {
        produce_map.set(key, [tempProduct].concat(produce_map.get(key)));
      } else {
        produce_map.set(key, [tempProduct]);
      }
    };
  });

  const shopify_order_id = payload.id;
  const shopify_title = payload.name;
  const shopify_customer_id = payload.customer.id;
  const total_price = parseInt(parseFloat(payload.total_price) * 100);

  for (let key of box_map.keys()) {
    let [delivered, box_title] = key.split('::');
    let boxItem = box_map.get(key);
    let productItems = produce_map.get(key);

    const box = await models.Box.findOne({
      where: {
        shopify_variant_id: boxItem.shopify_variant_id,
        delivered: new Date(Date.parse(delivered)),
      },
      include: {
        model: models.ShopifyBox,
        attribute: ['shopify_product_id', 'id'],
      }
    });
    let addOnProducts = listOfToArray(boxItem.addons);
    console.log('addOns', addOnProducts);
    const cart = {
      box_id: box.id,
      delivered,
      including: listOfToArray(boxItem.including),
      addons: addOnProducts,
      dislikes: listOfToArray(boxItem.dislikes),
      shopify_title: box_title,
      shopify_id: boxItem.shopify_product_id,
      subscription: boxItem.subscription,
      total_price: getTotalPrice(productItems.concat([boxItem])),
      quantities: getQuantities(productItems, addOnProducts),
      is_loaded: true,
    };
    const order_input = {
      shopify_title: shopify_title,
      shopify_order_id,
      shopify_line_item_id: boxItem.line_item_id,
      BoxId: box.id,
      ShopifyBoxId: box.ShopifyBox.id,
      CustomerId: null, // TODO XXX
      SubscriptionId: null, // TODO XXX
    };
    console.log('Subscription', boxItem.subscription);
    console.log('Inserting order with', order_input);
    console.log('Cart: ', cart);
    console.log('The box', box.toJSON());

    const [customer, customerCreated] = await models.Customer.findOrCreate({
      where: {
        shopify_customer_id,
      }
    });

    if (boxItem.subscription) {
      const subscriptionType = await models.SubscriptionType.findOne({
        where: {
          ShopifyBoxId: box.ShopifyBoxId,
          title: boxItem.subscription,
        }
      });
      const [subscriber, subscriberCreated] = await models.Subscriber.findOrCreate({
        where: {
          CustomerId: customer.id,
        },
      });
      const [subscription, subscriptionCreated] = await models.Subscription.findOrCreate({
        where: {
          SubscriberId: subscriber.id,
          SubscriptionTypeId: subscriptionType.id,
        },
        defaults: {
          current_cart: cart,
          last_cart: cart,
        },
      });
      console.log('Sub Type', subscriptionType.toJSON());
      console.log('Subscriber', subscriber.toJSON());
      console.log('Subscription', subscription.toJSON());
    };
    console.log(customer.toJSON());

    const order = await models.Order.create(order_input);

    console.log('The order', order);
    
  };
}

module.exports = orderCreate;
