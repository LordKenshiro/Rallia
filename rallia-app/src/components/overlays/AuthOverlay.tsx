import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Overlay from './Overlay';
import { COLORS } from '../../constants';

interface AuthOverlayProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  onShowCalendarOverlay?: () => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ visible, onClose, onAuthSuccess, onShowCalendarOverlay }) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState(['', '', '', '', '', '']);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isEmailValid = isValidEmail(email);

  const handleGoogleSignIn = () => {
    console.log('Sign in with Google');
    // TODO: Implement Google authentication
  };

  const handleAppleSignIn = () => {
    console.log('Sign in with Apple');
    // TODO: Implement Apple authentication
  };

  const handleFacebookSignIn = () => {
    console.log('Sign in with Facebook');
    // TODO: Implement Facebook authentication
  };

  const handleEmailContinue = () => {
    console.log('Continue with email:', email);
    // TODO: Send verification code to email
    setStep('code');
    
    // Trigger calendar overlay after a short delay
    if (onShowCalendarOverlay) {
      setTimeout(() => {
        onShowCalendarOverlay();
      }, 300);
    }
  };

  const handleResendCode = () => {
    console.log('Resend code to:', email);
    // TODO: Resend verification code
  };

  const handleVerifyCode = () => {
    const fullCode = code.join('');
    console.log('Verify code:', fullCode);
    // TODO: Verify code and sign in with Supabase
    // After successful verification, trigger the next step
    if (onAuthSuccess) {
      onAuthSuccess();
    }
  };

  const handleBack = () => {
    if (step === 'code') {
      setStep('email');
      setCode(['', '', '', '', '', '']);
    } else {
      onClose();
    }
  };

  // Reset to email step when overlay closes
  React.useEffect(() => {
    if (!visible) {
      // Reset after animation completes
      setTimeout(() => {
        setStep('email');
        setCode(['', '', '', '', '', '']);
        setEmail('');
      }, 300);
    }
  }, [visible]);

  return (
    <Overlay visible={visible} onClose={handleBack}>
      <View style={styles.container}>
        {step === 'email' ? (
          // Email Entry Step
          <>
            {/* Title */}
            <Text style={styles.title}>Sign In</Text>

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={handleAppleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={handleFacebookSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-facebook" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* OR Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <TextInput
              style={styles.emailInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Continue Button */}
            <TouchableOpacity 
              style={[
                styles.continueButton,
                !isEmailValid && styles.continueButtonDisabled
              ]}
              onPress={isEmailValid ? handleEmailContinue : undefined}
              activeOpacity={isEmailValid ? 0.8 : 1}
              disabled={!isEmailValid}
            >
              <Text style={[
                styles.continueButtonText,
                !isEmailValid && styles.continueButtonTextDisabled
              ]}>
                Continue
              </Text>
            </TouchableOpacity>

            {/* Terms Text */}
            <Text style={styles.termsText}>
              By continuing, you agree to Rallia's Terms of Use.
            </Text>
          </>
        ) : (
          // Code Verification Step
          <>
            {/* Title */}
            <Text style={styles.title}>Enter code</Text>

            {/* Description */}
            <Text style={styles.description}>
              We sent an email verification code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>

            {/* Code Input Boxes */}
            <View style={styles.codeInputContainer}>
              {code.map((digit, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.codeBox}
                  onPress={() => {
                    // Simulate entering digits for demo
                    const newCode = [...code];
                    const emptyIndex = newCode.findIndex(d => d === '');
                    if (emptyIndex !== -1) {
                      newCode[emptyIndex] = String(Math.floor(Math.random() * 10));
                      setCode(newCode);
                    }
                  }}
                >
                  <Text style={styles.codeDigit}>{digit || '—'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Resend Code Button */}
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResendCode}
              activeOpacity={0.8}
            >
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleVerifyCode}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 25,
  },
  socialButton: {
    width: 70,
    height: 50,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.overlayDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  emailInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  continueButton: {
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: COLORS.overlayDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  termsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },
  // Code verification step styles
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  emailText: {
    color: '#333',
    fontWeight: '600',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 25,
  },
  codeBox: {
    width: 40,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  resendButton: {
    backgroundColor: '#FFE8EA',
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  resendButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AuthOverlay;
