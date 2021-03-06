const models = require('../../db/models');

const resolvers = {
  Subscription: {
    async subscriber(instance, args, context, info) {
      return await instance.Subscriber;
    },
    async orders(instance, args, context, info) {
      return await instance.Orders;
    },
    async shopify_product_id(instance, args, context, info) {
      return await instance.SubscriptionType.ShopifyBox.shopify_product_id;
    },
    async shopify_customer_id(instance, args, context, info) {
      return await instance.Subscriber.Customer.shopify_customer_id;
    },
  },
  Query: {
    async getSubscription(root, { input }, context, info) {
      const { uid } = input;
      const subscription = await models.Subscription.findOne({ 
        where: { uid },
      });
      return subscription;
    },
    async getSubscriptions(root, { input }, context, info) {
      let { SubscriberId } = input;
      const subscriptions = await models.Subscription.findAll({
        where: { SubscriberId },
      });
      return subscriptions;
    },
  },
  Mutation: {
    async createSubscription (root, { input }, context, info) {
      return models.Subscription.create(input);
    },
    async updateSubscription (root, { input }, context, info) {
      const { uid, ...props } = input;
      console.log('update subscription input', input);
      await models.Subscription.update(
        props,
        { where: { uid } }
      );
      return models.Subscription.findOne({ 
        where: { uid },
      });
    },
    async deleteSubscription (root, { input }, context, info) {
      /* uid */
      const { uid } = input;
      return models.Subscription.destroy({ where: { uid } });
    },
  },
};

module.exports = resolvers;


