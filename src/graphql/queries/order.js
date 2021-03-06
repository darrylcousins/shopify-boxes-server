const { gql } = require('@apollo/client');

const OrderQueries = {
  getOrders: gql`
    query getOrders($input: OrderSearchInput!) {
      getOrders(input: $input) {
        count
        rows {
          id
          shopify_title
          shopify_order_id
          shopify_line_item_id
          box {
            delivered
            shopifyBox {
              shopify_product_id
              shopify_variant_id
            }
          }
          customer {
            shopify_customer_id
          }
        }
      }
    }
  `,
  getOrdersDeliveredAndCount: gql`
    query getOrdersDeliveredAndCount {
      getOrdersDeliveredAndCount {
        delivered
        count
      }
    }
  `,
};
const OrderMutations = {
};

module.exports = {
  OrderQueries,
  OrderMutations,
};
