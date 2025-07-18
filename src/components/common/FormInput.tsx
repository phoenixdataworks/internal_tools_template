import { TextField } from '@mui/material';
import { forwardRef } from 'react';

type TextFieldProps = React.ComponentProps<typeof TextField>;

export type AutocompleteType =
  | 'off'
  | 'name'
  | 'honorific-prefix'
  | 'given-name'
  | 'additional-name'
  | 'family-name'
  | 'honorific-suffix'
  | 'nickname'
  | 'email'
  | 'username'
  | 'new-password'
  | 'current-password'
  | 'one-time-code'
  | 'organization-title'
  | 'organization'
  | 'street-address'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'address-level4'
  | 'address-level3'
  | 'address-level2'
  | 'address-level1'
  | 'country'
  | 'country-name'
  | 'postal-code'
  | 'cc-name'
  | 'cc-given-name'
  | 'cc-additional-name'
  | 'cc-family-name'
  | 'cc-number'
  | 'cc-exp'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-csc'
  | 'cc-type'
  | 'transaction-currency'
  | 'transaction-amount'
  | 'language'
  | 'bday'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'sex'
  | 'tel'
  | 'tel-country-code'
  | 'tel-national'
  | 'tel-area-code'
  | 'tel-local'
  | 'tel-extension'
  | 'impp'
  | 'url'
  | 'photo';

export interface FormInputProps extends Omit<TextFieldProps, 'autoComplete'> {
  autoComplete?: AutocompleteType;
  name: string;
  section?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ autoComplete, name, section, ...props }, ref) => {
    // Generate a unique, consistent ID for the input
    const inputId = section ? `${section}-${name}` : name;

    // Handle autocomplete attribute
    const autocompleteValue = autoComplete || 'off';

    return (
      <TextField
        {...props}
        id={inputId}
        name={name}
        ref={ref}
        autoComplete={autocompleteValue}
        slotProps={{
          htmlInput: {
            ...props.inputProps,
            'data-form-type': props.type,
            'data-lpignore': autoComplete === 'off' ? true : undefined,
          },
        }}
      />
    );
  }
);

FormInput.displayName = 'FormInput';
