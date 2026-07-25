import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";
import { Field, FieldError, FieldLabel } from "./Field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./InputGroup";
import { Search } from "lucide-react";

const meta: Meta<typeof Input> = {
  title: "Input/Input",
  component: Input,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => <Input placeholder="Type something..." className="w-64" />,
};

export const WithField: Story = {
  render: () => (
    <Field className="w-64">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" type="email" placeholder="you@example.com" />
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field className="w-64">
      <FieldLabel htmlFor="email-error">Email</FieldLabel>
      <Input id="email-error" type="email" placeholder="you@example.com" aria-invalid />
      <FieldError>Please enter a valid email address.</FieldError>
    </Field>
  ),
};

export const WithAddon: Story = {
  render: () => (
    <InputGroup className="w-64">
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
};

export const Disabled: Story = {
  render: () => <Input placeholder="Disabled input" disabled className="w-64" />,
};
