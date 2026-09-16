import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/app_theme.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _bgController;
  late AnimationController _textController;
  late AnimationController _subtitleController;
  late AnimationController _lineController;
  late Animation<double> _bgAnimation;
  late Animation<double> _lineAnimation;

  @override
  void initState() {
    super.initState();

    _bgController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _textController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _subtitleController = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _lineController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));

    _bgAnimation = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _bgController, curve: Curves.easeOut));
    _lineAnimation = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _lineController, curve: Curves.easeOut));

    _runSequence();
  }

  Future<void> _runSequence() async {
    await Future.delayed(const Duration(milliseconds: 300));
    _bgController.forward();
    _textController.forward();
    await Future.delayed(const Duration(milliseconds: 800));
    _subtitleController.forward();
    _lineController.forward();
    await Future.delayed(const Duration(milliseconds: 1200));
    _navigate();
  }

  Future<void> _navigate() async {
    final auth = context.read<AuthProvider>();
    while (auth.loading) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
    if (!mounted) return;
    context.go(auth.isLoggedIn ? '/dashboard' : '/login');
  }

  @override
  void dispose() {
    _bgController.dispose();
    _textController.dispose();
    _subtitleController.dispose();
    _lineController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: _bgAnimation,
        builder: (context, child) {
          return Container(
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(0, -0.2),
                radius: 1.2,
                colors: [
                  Color.lerp(Colors.white, AppTheme.primary, _bgAnimation.value)!,
                  Color.lerp(Colors.white, AppTheme.darkBackground, _bgAnimation.value)!,
                ],
              ),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Glow ring
                FadeTransition(
                  opacity: _bgAnimation,
                  child: Container(
                    width: 300,
                    height: 300,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.secondary.withOpacity(0.2), width: 2),
                      boxShadow: [BoxShadow(color: AppTheme.secondary.withOpacity(0.1), blurRadius: 50)],
                    ),
                  ),
                ),

                // ZETECH text
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SlideTransition(
                      position: Tween<Offset>(begin: const Offset(-1, 0), end: Offset.zero)
                          .animate(CurvedAnimation(parent: _textController, curve: Curves.easeOutCubic)),
                      child: FadeTransition(
                        opacity: _textController,
                        child: AnimatedBuilder(
                          animation: _bgAnimation,
                          builder: (context, _) => Text(
                            'ZETECH',
                            style: TextStyle(
                              fontSize: 72,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 4,
                              color: _bgAnimation.value > 0.5 ? Colors.white : AppTheme.primary,
                              shadows: _bgAnimation.value > 0.5
                                  ? [Shadow(color: Colors.black.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 2))]
                                  : null,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Subtitle
                    FadeTransition(
                      opacity: _subtitleController,
                      child: SlideTransition(
                        position: Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero)
                            .animate(CurvedAnimation(parent: _subtitleController, curve: Curves.easeOut)),
                        child: const Text(
                          'HOSTEL MANAGEMENT',
                          style: TextStyle(
                            color: AppTheme.secondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 6,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Gold line
                    AnimatedBuilder(
                      animation: _lineAnimation,
                      builder: (context, _) => Container(
                        width: 200 * _lineAnimation.value,
                        height: 2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.transparent, AppTheme.secondary, Colors.transparent],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
