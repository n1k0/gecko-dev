from marionette_test import MarionetteTestCase
from by import By

class TestSomething(MarionetteTestCase):
    def test_foo(self):
        
        # this is browser chrome, kids, not the content window just yet
        self.marionette.set_context("chrome")

        self.marionette.find_element(By.ID, "social-status-button-browser")

        # click the element

        # switch to the frame

        # set context to content
        self.marionette.set_context("content")

        # find content element
