import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./Checkbox";
import { Field, FieldLabel } from "./Field";

const meta: Meta<typeof Checkbox> = {
  title: "Input/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => <Checkbox />,
};

export const WithLabel: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="terms" />
      <FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
    </Field>
  ),
};

export const Checked: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="checked" checked />
      <FieldLabel htmlFor="checked">Already checked</FieldLabel>
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="disabled" disabled />
      <FieldLabel htmlFor="disabled">Disabled checkbox</FieldLabel>
    </Field>
  ),
};
