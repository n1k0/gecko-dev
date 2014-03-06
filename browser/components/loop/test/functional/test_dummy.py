from marionette_test import MarionetteTestCase

class TestSomething(MarionetteTestCase):
    def test_foo(self):
        self.assertEqual(9, 3 * 3, '3 x 3 should be 9')
        self.assertTrue(type(2) == int, '2 should be an integer')
