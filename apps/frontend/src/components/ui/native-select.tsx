import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type NativeSelectProps = Omit<React.ComponentPropsWithoutRef<"select">, "size" | "onChange"> & {
  size?: "sm" | "default"
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void
}

const EMPTY_SENTINEL = "__native_select_empty__"

type ParsedOption = {
  value: string
  disabled?: boolean
  label: React.ReactNode
}

type ParsedGroup = {
  label?: React.ReactNode
  options: ParsedOption[]
}

function normalizeValue(value: unknown): string {
  if (value === undefined || value === null) return ""
  return String(value)
}

function parseOptions(children: React.ReactNode): ParsedGroup[] {
  const groups: ParsedGroup[] = []
  const rootOptions: ParsedOption[] = []

  const parseOptionNode = (node: React.ReactNode): ParsedOption | null => {
    if (!React.isValidElement(node)) return null
    const nodeType = node.type
    if (nodeType !== "option" && nodeType !== NativeSelectOption) {
      return null
    }
    return {
      value: normalizeValue((node.props as { value?: unknown }).value),
      disabled: Boolean((node.props as { disabled?: boolean }).disabled),
      label: (node.props as { children?: React.ReactNode }).children,
    }
  }

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const childType = child.type

    if (childType === "option" || childType === NativeSelectOption) {
      const parsed = parseOptionNode(child)
      if (parsed) rootOptions.push(parsed)
      return
    }

    if (childType === "optgroup" || childType === NativeSelectOptGroup) {
      const options: ParsedOption[] = []
      React.Children.forEach(
        (child.props as { children?: React.ReactNode }).children,
        (optionNode) => {
          const parsed = parseOptionNode(optionNode)
          if (parsed) options.push(parsed)
        },
      )
      if (options.length > 0) {
        groups.push({
          label: (child.props as { label?: React.ReactNode }).label,
          options,
        })
      }
    }
  })

  if (rootOptions.length > 0) {
    groups.unshift({ options: rootOptions })
  }
  return groups
}

function NativeSelect({
  className,
  size = "default",
  children,
  value,
  defaultValue,
  name,
  id,
  disabled,
  required,
  onChange,
  ...restProps
}: NativeSelectProps) {
  const optionGroups = React.useMemo(() => parseOptions(children), [children])
  const options = React.useMemo(
    () => optionGroups.flatMap((group) => group.options),
    [optionGroups],
  )
  const firstValue = options[0]?.value ?? ""
  const isControlled = value !== undefined

  const [internalValue, setInternalValue] = React.useState<string>(
    normalizeValue(defaultValue ?? firstValue),
  )

  React.useEffect(() => {
    if (!isControlled && internalValue === "" && firstValue !== "") {
      setInternalValue(firstValue)
    }
  }, [firstValue, internalValue, isControlled])

  const currentValue = isControlled
    ? normalizeValue(value)
    : internalValue

  const selectValue = currentValue === "" ? EMPTY_SENTINEL : currentValue

  const handleValueChange = (nextValue: string) => {
    const normalized = nextValue === EMPTY_SENTINEL ? "" : nextValue
    if (!isControlled) {
      setInternalValue(normalized)
    }
    if (onChange) {
      onChange({
        target: { value: normalized, name },
        currentTarget: { value: normalized, name },
      } as React.ChangeEvent<HTMLSelectElement>)
    }
  }

  return (
    <div
      className={cn(
        "group/native-select relative w-full has-[button:disabled]:opacity-50",
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          data-slot="native-select"
          data-size={size}
          className={cn(
            "w-full min-w-0 data-[size=sm]:h-8",
            className,
          )}
          aria-required={required}
          {...(restProps as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {optionGroups.map((group, groupIndex) => (
            <SelectGroup key={groupIndex}>
              {group.label ? <SelectLabel>{group.label}</SelectLabel> : null}
              {group.options.map((option) => {
                const optionValue = option.value === "" ? EMPTY_SENTINEL : option.value
                return (
                  <SelectItem
                    key={`${groupIndex}-${optionValue}`}
                    value={optionValue}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                )
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
