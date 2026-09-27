const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// GET all clients or search
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const query = q ? { name: { $regex: q, $options: 'i' } } : {};
    const clients = await Client.find(query).sort({ lastBilledAt: -1 }).limit(50);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new client
router.post('/', async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update client
router.put('/:id', async (req, res) => {
  try {
    const updated = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
