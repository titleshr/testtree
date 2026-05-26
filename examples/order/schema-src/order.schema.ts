// Example: TypeScript enum
enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
}

// Example: Zod schema with enum and constraints
const OrderSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETE', 'CANCEL']),
  channel: z.enum(['WEB', 'APP', 'KIOSK']),
  payment: z.object({
    type: z.nativeEnum(PaymentType),
    amount: z.number().min(0),
  }),
});

// Example: class-validator DTO
class CreateOrderDto {
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: string;

  @Min(0)
  @Max(999999)
  amount: number;

  @MinLength(3)
  @MaxLength(50)
  channel: string;
}
