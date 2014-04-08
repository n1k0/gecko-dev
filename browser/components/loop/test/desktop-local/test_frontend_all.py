from marionette_test import MarionetteTestCase
import threading
import SimpleHTTPServer
import SocketServer
import BaseHTTPServer
from ipdb import set_trace

PORT = 2222
SRCDIR_PATH = "browser/components/loop/test/desktop-local/"
SERVER_PREFIX = "http://localhost:" + str(PORT) + "/" + SRCDIR_PATH

class ThreadingSimpleServer(SocketServer.ThreadingMixIn,
                            BaseHTTPServer.HTTPServer):
    pass


class TestFrontendAll(MarionetteTestCase):

    @classmethod
    def setUpClass(cls):
        print "in setUpClass"
        super(TestFrontendAll, cls).setUpClass()

        server = ThreadingSimpleServer(('', PORT),
                            SimpleHTTPServer.SimpleHTTPRequestHandler)

        server_thread = threading.Thread(target=server.serve_forever)
        server_thread.daemon = True
        server_thread.start()

    def check_page(self, url):
        self.marionette.navigate(url)
        set_trace()
        self.marionette.find_element("id", 'complete')
        fail_node = self.marionette.find_element("css selector", '.failures > em')
        if fail_node.text == "0":
            return
        raise AssertionError(self.get_failure_details())

    def get_failure_details(self):
        fail_nodes = self.marionette.find_elements("css selector",'.test.fail')
        details = ["%d failure(s) encountered:" % len(fail_nodes)]
        for node in fail_nodes:
            details.append(
                node.find_element("tag name", 'h2').text.split("\n")[0])
            details.append(
                node.find_element("css selector",'.error').text)
        return "\n".join(details)

    def test_index_html(self):
        self.check_page(SERVER_PREFIX + "index.html")


