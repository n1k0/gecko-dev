from marionette_test import MarionetteTestCase
from by import By
import time

class TestSomething(MarionetteTestCase):

    def test_foo(self):
        
        # this is browser chrome, not the content window just yet
        self.marionette.set_context("chrome")

        # drop down the status panel
        self.marionette.find_element(By.ID,
                                     "social-status-button-browser").click()

        # ensure this isn't just that we're looking too early.  With this
        # sleep, the panel is visible to the eye for multiple seconds before
        # the frame switch is attempted and the exception is thrown.
        time.sleep(5)

        # switch to the frame
        panel_frame = self.marionette.find_element(By.CLASS_NAME,
                                                   "social-panel-frame")
        self.marionette.switch_to_frame(panel_frame)

