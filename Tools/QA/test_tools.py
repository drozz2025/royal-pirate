import tempfile
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET
from verify_test_results import validate
from static_checks import check_file
from analyze_frames import summarize


class ResultGateTests(unittest.TestCase):
    def parse(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'results.xml';path.write_text(text);return validate(path)

    def test_pass(self):
        self.assertEqual(1, self.parse('<test-run result="Passed" total="1" passed="1"><test-case result="Passed"/></test-run>'))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError): self.parse('<test-run result="Passed" total="0" passed="0"/>')

    def test_failure_rejected(self):
        with self.assertRaises(ValueError): self.parse('<test-run result="Failed" total="1" passed="0"><test-case result="Failed"/></test-run>')

    def test_skip_rejected_even_if_root_claims_pass(self):
        with self.assertRaises(ValueError): self.parse('<test-run result="Passed" total="1" passed="1"><test-case result="Skipped"/></test-run>')

    def test_wrong_count_rejected(self):
        with self.assertRaises(ValueError): self.parse('<test-run result="Passed" total="2" passed="2"><test-case result="Passed"/></test-run>')

    def test_missing_xml(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError): validate(Path(directory)/'absent.xml')

    def test_truncated_xml(self):
        with self.assertRaises(ET.ParseError): self.parse('<test-run')

    def test_conflict(self):
        self.assertIn('unresolved merge conflict', check_file('file.cs', ('<'*7+' HEAD\nx\n'+'='*7+'\ny\n'+'>'*7+' branch').encode()))

    def test_secret_is_redacted(self):
        self.assertEqual(['possible embedded credential'], check_file('file.cs', ('gh'+'p_'+'x'*36).encode()))

    def test_signing_file(self):
        self.assertIn('credential/signing file', check_file('release.jks', b'\0'))

    def test_regular_source(self):
        self.assertEqual([], check_file('file.cs', b'public class Safe {}'))

    def test_frame_metrics(self):
        report = summarize([20.0]*99+[100.0])
        self.assertEqual(20.0, report['p95_ms'])
        self.assertEqual(1, report['frames_over_50ms'])

    def test_nonfinite_frames_rejected(self):
        with self.assertRaises(ValueError): summarize([float('nan')])

    def test_empty_frames_rejected(self):
        with self.assertRaises(ValueError): summarize([])


if __name__ == '__main__': unittest.main()
