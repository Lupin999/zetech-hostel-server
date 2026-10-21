import 'dart:async';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../config/api_config.dart';

class ConnectionStatusBanner extends StatefulWidget {
  const ConnectionStatusBanner({required this.child, super.key});

  final Widget child;

  @override
  State<ConnectionStatusBanner> createState() => _ConnectionStatusBannerState();
}

class _ConnectionStatusBannerState extends State<ConnectionStatusBanner> {
  String? _errorMessage;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _checkConnection();
  }

  Future<void> _checkConnection() async {
    if (mounted) {
      setState(() {
        _checking = true;
        _errorMessage = null;
      });
    }

    final configurationError = ApiConfig.configurationError;
    if (configurationError != null) {
      _setError(configurationError);
      return;
    }

    try {
      final response = await http
          .get(Uri.parse(ApiConfig.status))
          .timeout(const Duration(seconds: 8));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        _setError(
          'The server returned HTTP ${response.statusCode}. Check the server and try again.',
        );
        return;
      }
      if (mounted) {
        setState(() {
          _checking = false;
          _errorMessage = null;
        });
      }
    } on http.ClientException {
      _setError(
        'Cannot reach the server. Check that it is running, your phone and '
        'computer are on the same Wi-Fi, and Windows Firewall allows port 5000. '
        'For a physical phone, set API_BASE_URL to the laptop LAN IP.',
      );
    } on TimeoutException {
      _setError(
        'The server did not respond. Check your connection and try again.',
      );
    } on FormatException {
      _setError(
        'The configured API_BASE_URL is invalid. Check the server URL.',
      );
    } on ArgumentError {
      _setError(
        'The configured API_BASE_URL is invalid. Check the server URL.',
      );
    }
  }

  void _setError(String message) {
    if (!mounted) return;
    setState(() {
      _checking = false;
      _errorMessage = message;
    });
  }

  @override
  Widget build(BuildContext context) {
    final message = _errorMessage;
    return Column(
      children: [
        if (_checking)
          const LinearProgressIndicator(minHeight: 3)
        else if (message != null)
          Material(
            color: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF5B1B1B)
                : const Color(0xFFFFE4E6),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.cloud_off, color: Color(0xFFB91C1C)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        message,
                        style: TextStyle(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.white
                              : const Color(0xFF7F1D1D),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _checking ? null : _checkConnection,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
