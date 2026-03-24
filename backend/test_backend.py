import unittest
from app import app

class BackendTestCase(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_get_sensors(self):
        response = self.app.get('/api/sensors')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, list)

    def test_add_sensor(self):
        response = self.app.post('/api/sensors', json={"name": "Test Sensor"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("id", response.json)
        self.assertEqual(response.json["name"], "Test Sensor")

    def test_update_sensor(self):
        # Assuming sensor with ID 1 exists
        response = self.app.put('/api/sensors/1', json={"name": "Updated Sensor"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["name"], "Updated Sensor")

    def test_delete_sensor(self):
        # Assuming sensor with ID 1 exists
        response = self.app.delete('/api/sensors/1')
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json)

if __name__ == '__main__':
    unittest.main()