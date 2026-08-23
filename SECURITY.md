# Security policy

## Supported versions

The latest release and the current `main` branch receive security fixes.

## Report a vulnerability

Use GitHub's **Security** tab and choose **Report a vulnerability** to send a
private report. Do not open a public issue.

Include:

- the affected browser and version;
- steps to reproduce;
- the security impact;
- a minimal synthetic test image when needed;
- any suggested mitigation.

You should receive an acknowledgement within seven days. Valid reports are
investigated privately, fixed on a risk-based timeline, and disclosed after a
patch is available. Reporters are credited when they want attribution.

## Privacy boundary

The production application has no image upload API. A change that transmits
image pixels, filenames, edit settings, or generated files off-device is a
security- and privacy-sensitive architecture change.
