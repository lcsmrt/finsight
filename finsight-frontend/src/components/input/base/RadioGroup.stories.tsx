import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";
import { Field, FieldLabel } from "./Field";

const meta: Meta<typeof RadioGroup> = {
  title: "Input/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option1">
      <Field orientation="horizontal">
        <RadioGroupItem id="option1" value="option1" />
        <FieldLabel htmlFor="option1">Option 1</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem id="option2" value="option2" />
        <FieldLabel htmlFor="option2">Option 2</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem id="option3" value="option3" />
        <FieldLabel htmlFor="option3">Option 3</FieldLabel>
      </Field>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option1">
      <Field orientation="horizontal">
        <RadioGroupItem id="r-option1" value="option1" />
        <FieldLabel htmlFor="r-option1">Option 1</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem id="r-option2" value="option2" disabled />
        <FieldLabel htmlFor="r-option2">Option 2 (disabled)</FieldLabel>
      </Field>
    </RadioGroup>
  ),
};
