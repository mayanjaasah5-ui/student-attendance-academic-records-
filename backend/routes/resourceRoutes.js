const express = require('express');
const { createController } = require('../controllers/crudController');

function resourceRoutes(resource) {
  const router = express.Router();
  const controller = createController(resource);
  router.route('/')
    .get(controller.list)
    .post(controller.create);
  router.route('/:id')
    .get(controller.get)
    .put(controller.update)
    .delete(controller.remove);
  return router;
}

module.exports = resourceRoutes;
