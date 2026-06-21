'use client';

import { Controller, ControllerRenderProps, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useImperativeHandle } from 'react';
import { Button } from '@bytebank/design-system';
import { CurrencyInput } from '@bytebank/design-system';
import { DatePicker } from '@bytebank/design-system';
import { Input } from '@bytebank/design-system';
import { HelperText } from '@bytebank/design-system';
import { Select } from '@bytebank/design-system';
import { CategorySelect } from '@bytebank/design-system';
import { TRANSACTION_TYPE, TRANSACTION_TYPE_OPTIONS, suggestCategory } from '@bytebank/shared';
import type { CategoryId } from '@bytebank/shared';
import { transactionFormSchema } from './schema';
import type {
  TransactionFormProps,
  TransactionFormRef,
  TransactionFormValues,
} from './ITransactionForm';

const CURRENCY = 'R$';
const DEFAULT_CURRENCY_PLACEHOLDER = '0,00';
const DEFAULT_DATE_PLACEHOLDER = 'Selecione uma data';
const DEFAULT_DESCRIPTION_PLACEHOLDER = 'Adicione uma descrição';

function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export const TransactionForm = forwardRef<TransactionFormRef, TransactionFormProps>(
  function TransactionForm({ onSubmit, initialValues, isSubmitting = false }, ref) {
    const {
      control,
      handleSubmit,
      reset,
      formState: { errors, isDirty, isValid },
    } = useForm({
      mode: 'onChange',
      resolver: zodResolver(transactionFormSchema),
      defaultValues: {
        type: initialValues?.type || TRANSACTION_TYPE.DEPOSIT,
        amount: initialValues?.amount || 0,
        date: initialValues?.date || '',
        description: initialValues?.description || '',
        category: initialValues?.category ?? '',
      },
    });

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const description = useWatch({ control, name: 'description' });
    const suggestedCategory = suggestCategory(description ?? '');

    const handleFormSubmit = (data: TransactionFormValues) => {
      onSubmit({
        ...data,
        amount: roundAmount(data.amount),
      });
    };

    const getSubmitButtonLabel = () => {
      if (initialValues) {
        return isSubmitting ? 'Atualizando...' : 'Atualizar transação';
      }
      return isSubmitting ? 'Concluindo...' : 'Concluir transação';
    };

    const clearField = (field: ControllerRenderProps<TransactionFormValues>) => {
      if (!field.value) return undefined;
      return () => field.onChange(field.name === 'amount' ? 0 : '');
    };

    return (
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-md">
        <div>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Selecione o tipo de transação"
                options={TRANSACTION_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                onClear={clearField(field)}
              />
            )}
          />
          {errors.type?.message && <HelperText error>{errors.type.message}</HelperText>}
        </div>

        <div className="flex flex-col gap-md sm:flex-row">
          <div className="flex-1 min-w-0">
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label="Valor"
                  value={field.value}
                  onValueChange={field.onChange}
                  currency={CURRENCY}
                  placeholder={DEFAULT_CURRENCY_PLACEHOLDER}
                  disabled={isSubmitting}
                  error={!!errors.amount}
                  onClear={clearField(field)}
                />
              )}
            />
            {errors.amount?.message && <HelperText error>{errors.amount.message}</HelperText>}
          </div>

          <div className="flex-1 min-w-0">
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  label="Data"
                  placeholder={DEFAULT_DATE_PLACEHOLDER}
                  disabled={isSubmitting}
                  onChange={field.onChange}
                  error={!!errors.date}
                  onClear={clearField(field)}
                />
              )}
            />
            {errors.date?.message && <HelperText error>{errors.date.message}</HelperText>}
          </div>
        </div>

        <div>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Descrição"
                placeholder={DEFAULT_DESCRIPTION_PLACEHOLDER}
                disabled={isSubmitting}
                error={!!errors.description}
                maxLength={80}
                onClear={clearField(field)}
                className="pr-15"
              />
            )}
          />
          <div className="flex justify-between items-center">
            {errors.description?.message ? (
              <HelperText error>{errors.description.message}</HelperText>
            ) : (
              <span />
            )}
            <span className="text-sm text-content-secondary tabular-nums mt-1">
              {(description ?? '').length}/80
            </span>
          </div>
        </div>

        <div>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <CategorySelect
                label="Categoria"
                value={(field.value ?? '') as CategoryId | ''}
                onChange={field.onChange}
                suggestedCategory={suggestedCategory}
                disabled={isSubmitting}
                error={errors.category?.message}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-sm mt-lg sm:flex-row sm:justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty || !isValid}
            loading={isSubmitting}
          >
            {getSubmitButtonLabel()}
          </Button>
        </div>
      </form>
    );
  }
);
