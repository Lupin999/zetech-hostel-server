import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/user_model.dart';
import '../utils/api_client.dart';

class AuthProvider extends ChangeNotifier {
  User? user;
  String? token;
  bool loading = true;

  AuthProvider() {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      token = prefs.getString('token');
      if (token != null) {
        final res = await ApiClient.get(ApiConfig.verify);
        user = User.fromJson(res['user']);
      }
    } catch (_) {
      token = null;
      user = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await ApiClient.post(ApiConfig.login, body: {'email': email, 'password': password});
    final data = Map<String, dynamic>.from(res);
    token = data['token'].toString();
    user = User.fromJson(Map<String, dynamic>.from(data['user']));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token!);
    notifyListeners();
    return data;
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    final res = await ApiClient.post(ApiConfig.register, body: data);
    return res;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    token = null;
    user = null;
    notifyListeners();
  }

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    // Server expects { phone: '...' }
    return await ApiClient.post(ApiConfig.sendOtp, body: {'phone': phone});
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    // Server expects { phone: '...', code: '...' }
    final res = await ApiClient.post(ApiConfig.verifyOtp, body: {'phone': phone, 'code': code});
    final data = Map<String, dynamic>.from(res);
    // OTP login also returns a token + user — persist them
    if (data['token'] != null) {
      token = data['token'].toString();
      user = User.fromJson(Map<String, dynamic>.from(data['user']));
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token!);
      notifyListeners();
    }
    return data;
  }

  bool get isLoggedIn => token != null;

  void updateUser(User updatedUser) {
    user = updatedUser;
    notifyListeners();
  }
}
