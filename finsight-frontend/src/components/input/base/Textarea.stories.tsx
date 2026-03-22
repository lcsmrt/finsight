import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./Textarea";
import { Field, FieldError, FieldLabel } from "./Field";

const meta: Meta<typeof Textarea> = {
  title: "Input/Textarea",
  component: Textarea,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  render: () => <Textarea placeholder="Write something..." className="w-64" />,
};

export const WithField: Story = {
  render: () => (
    <Field className="w-64">
      <FieldLabel htmlFor="notes">Notes</FieldLabel>
      <Textarea id="notes" placeholder="Add your notes here..." />
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field className="w-64">
      <FieldLabel htmlFor="notes-error">Notes</FieldLabel>
      <Textarea id="notes-error" placeholder="Add your notes here..." aria-invalid />
      <FieldError>This field is required.</FieldError>
    </Field>
  ),
};
