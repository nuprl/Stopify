const PubSub = require('@google-cloud/pubsub');
const pubsub = PubSub();
const topic = pubsub.topic('compile-scalajs-response');

topic.createSubscription('stopify-js-receiver').then(subscription => {

subscription[0].on('message', msg => {
  msg.ack();
  console.log(msg.data.toString());
});
});
