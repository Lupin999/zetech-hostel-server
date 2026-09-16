import 'package:flutter/material.dart';
import '../../config/app_theme.dart';

class CustomButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Color? color;
  final bool fullWidth;

  const CustomButton({super.key, required this.label, this.onPressed, this.isLoading = false, this.color, this.fullWidth = true});

  @override
  Widget build(BuildContext context) {
    final button = SizedBox(
      height: 52,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color ?? AppTheme.primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: isLoading
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      ),
    );
    return fullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}
