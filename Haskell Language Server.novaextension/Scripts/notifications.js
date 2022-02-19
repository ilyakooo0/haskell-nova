function sendNotification(title, body) {
  const request = new NotificationRequest();
  request.title = title;
  request.body = body;
  nova.notifications.add(request);
}

function sendPermanentNotification(title, body) {
  const request = new NotificationRequest();
  request.title = title;
  request.body = body;
  request.actions = ["OK"];
  nova.notifications.add(request);
}

function sendNotificationWithAction(title, body, actionName, action) {
  const now = Date.now().toString();
  const request = new NotificationRequest(now);
  request.title = title;
  request.body = body;
  request.actions = [actionName];
  nova.notifications.add(request).then((x) => {
    if (x) {
      action();
    }
  });
  return () => {
    nova.notifications.cancel(now);
  };
}

module.exports = {
  sendNotification,
  sendPermanentNotification,
  sendNotificationWithAction,
};
