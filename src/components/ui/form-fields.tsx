import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Icon } from '@/components/ui/icon';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

type BaseProps<T extends FieldValues> = Omit<TextFieldProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/** TextField bound to react-hook-form. Shows the field's validation message. */
export function FormTextField<T extends FieldValues>({ control, name, ...rest }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => (
        <TextField
          ref={ref}
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...rest}
        />
      )}
    />
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField<T extends FieldValues>(props: BaseProps<T>) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <FormTextField {...props} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={styles.withToggle} />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={8}
        style={styles.toggle}>
        <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="textSecondary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  withToggle: { paddingRight: 52 },
  // Aligned to the input row (label height + gap).
  toggle: { position: 'absolute', right: Spacing.two, top: 26, height: 50, width: 44, alignItems: 'center', justifyContent: 'center' },
});
