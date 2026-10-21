import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const _requestTimeout = Duration(seconds: 15);

  static Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> _handleResponse(http.Response response) async {
    if (response.statusCode == 401) {
      // Token expired or invalid — clear stored credentials immediately
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      throw Exception('Session expired. Please login again.');
    }
    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      throw Exception('Server error: ${response.statusCode}');
    }
    if (response.statusCode == 200 || response.statusCode == 201) {
      return body;
    }
    throw Exception(body['error'] ?? body['message'] ?? 'Request failed');
  }

  static Future<dynamic> _send(Future<http.Response> Function() request) async {
    try {
      final response = await request().timeout(_requestTimeout);
      return await _handleResponse(response);
    } on http.ClientException {
      throw Exception(
        'Cannot connect to the server. Check that it is running, your phone '
        'and computer are on the same Wi-Fi, and set API_BASE_URL to the '
        'correct server URL.',
      );
    } on TimeoutException {
      throw Exception('The server did not respond in time. Please try again.');
    }
  }

  static Future<dynamic> get(String url) async {
    return _send(
      () async => http.get(Uri.parse(url), headers: await _headers()),
    );
  }

  static Future<dynamic> post(String url, {Map<String, dynamic>? body}) async {
    return _send(
      () async => http.post(
        Uri.parse(url),
        headers: await _headers(),
        body: body != null ? jsonEncode(body) : null,
      ),
    );
  }

  static Future<dynamic> put(String url, {Map<String, dynamic>? body}) async {
    return _send(
      () async => http.put(
        Uri.parse(url),
        headers: await _headers(),
        body: body != null ? jsonEncode(body) : null,
      ),
    );
  }

  static Future<dynamic> patch(String url, {Map<String, dynamic>? body}) async {
    return _send(
      () async => http.patch(
        Uri.parse(url),
        headers: await _headers(),
        body: body != null ? jsonEncode(body) : null,
      ),
    );
  }

  static Future<dynamic> delete(String url) async {
    return _send(
      () async => http.delete(Uri.parse(url), headers: await _headers()),
    );
  }
}
