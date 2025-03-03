import { Window } from "./wm.ts"
import { EventEmitter } from "npm:eventemitter3"

/**
 * A generic UI controls class for creating interactive elements
 * like buttons, toggles, and sliders.
 */
export class Controls extends EventEmitter<{
    frameChanged: [number]
    keypointChanged: [number, boolean] // keypointIndex, isChecked
}> {
    protected container: HTMLDivElement
    protected controlsMap: Map<string, HTMLElement> = new Map()
    // Map to track radio button groups
    protected radioGroups: Map<string, Set<string>> = new Map()
    // Map to track checkbox groups
    protected checkboxGroups: Map<string, Set<string>> = new Map()

    constructor(public window: Window) {
        super()
        this.container = document.createElement("div")
        this.container.className = "controls horizontal" // Default to horizontal layout
        this.window.element.appendChild(this.container)
    }

    /**
     * Sets the layout orientation of the controls
     */
    setLayout(layout: "horizontal" | "vertical" | "grid") {
        this.container.classList.remove("horizontal", "vertical", "grid")
        this.container.classList.add(layout)
    }

    /**
     * Adds a simple button with a click handler
     */
    addButton(
        id: string,
        label: string,
        onClick: () => void,
    ): HTMLButtonElement {
        const button = document.createElement("button")
        button.textContent = label
        button.addEventListener("click", onClick)
        this.container.appendChild(button)
        this.controlsMap.set(id, button)
        return button
    }

    /**
     * Adds a toggle button that switches between two states
     */
    addToggleButton(
        id: string,
        labels: [string, string],
        isActive: () => boolean,
        onToggle: () => void,
    ): HTMLButtonElement {
        const button = document.createElement("button")
        button.textContent = isActive() ? labels[1] : labels[0]
        button.addEventListener("click", () => {
            onToggle()
            button.textContent = isActive() ? labels[1] : labels[0]
        })
        this.container.appendChild(button)
        this.controlsMap.set(id, button)
        return button
    }

    /**
     * Adds a radio button that is part of a group where only one can be selected
     */
    addRadioButton(
        id: string,
        groupName: string,
        label: string,
        value: unknown,
        isSelected: boolean,
        onSelect: (value: unknown) => void,
    ): HTMLButtonElement {
        // Create the button element
        const button = document.createElement("button")
        button.textContent = label
        button.dataset.value = String(value)

        // Set initial selected state
        if (isSelected) {
            button.classList.add("selected")
        }

        // Add to controls map
        this.controlsMap.set(id, button)

        // Add to radio group tracking
        if (!this.radioGroups.has(groupName)) {
            this.radioGroups.set(groupName, new Set())
        }
        this.radioGroups.get(groupName)?.add(id)

        // Add click handler
        button.addEventListener("click", () => {
            // Deselect all other buttons in the group
            const groupButtons = this.radioGroups.get(groupName) || new Set()
            for (const btnId of groupButtons) {
                const btn = this.getControl<HTMLButtonElement>(btnId)
                if (btn) {
                    btn.classList.remove("selected")
                }
            }

            // Select this button
            button.classList.add("selected")

            // Call the handler with this button's value
            onSelect(value)
        })

        this.container.appendChild(button)
        return button
    }

    /**
     * Creates a radio button group with multiple options
     */
    addRadioGroup(
        groupName: string,
        options: Array<{ id: string; label: string; value: unknown }>,
        initialValue: unknown,
        onChange: (value: unknown) => void,
    ): HTMLButtonElement[] {
        return options.map((option) =>
            this.addRadioButton(
                option.id,
                groupName,
                option.label,
                option.value,
                option.value === initialValue,
                onChange,
            )
        )
    }

    /**
     * Adds a slider control with min, max and step values
     */
    addSlider(
        id: string,
        min: number,
        max: number,
        step: number,
        initialValue: number,
        onChange: (value: number) => void,
    ): HTMLInputElement {
        const slider = document.createElement("input")
        slider.type = "range"
        slider.min = min.toString()
        slider.max = max.toString()
        slider.step = step.toString()
        slider.value = initialValue.toString()
        slider.addEventListener("input", () => {
            onChange(parseFloat(slider.value))
        })
        this.container.appendChild(slider)
        this.controlsMap.set(id, slider)
        return slider
    }

    /**
     * Gets a control by ID with type casting
     */
    getControl<T extends HTMLElement>(id: string): T | undefined {
        return this.controlsMap.get(id) as T | undefined
    }

    /**
     * Updates a control's properties or state
     */
    updateControl(id: string, updater: (element: HTMLElement) => void): void {
        const control = this.controlsMap.get(id)
        if (control) {
            updater(control)
        }
    }

    /**
     * Updates the selected radio button in a group
     */
    setRadioSelection(groupName: string, value: unknown): void {
        const groupButtons = this.radioGroups.get(groupName) || new Set()

        for (const btnId of groupButtons) {
            const btn = this.getControl<HTMLButtonElement>(btnId)
            if (btn) {
                if (btn.dataset.value === String(value)) {
                    btn.classList.add("selected")
                } else {
                    btn.classList.remove("selected")
                }
            }
        }
    }

    /**
     * Adds a checkbox button that can be toggled independently
     */
    addCheckboxButton(
        id: string,
        groupName: string,
        label: string,
        value: unknown,
        isChecked: boolean,
        onToggle: (value: unknown, isChecked: boolean) => void,
    ): HTMLButtonElement {
        // Create the button element
        const button = document.createElement("button")
        button.textContent = label
        button.dataset.value = String(value)
        button.className = "checkbox-button"

        // Set initial state
        if (isChecked) {
            button.classList.add("checked")
        }

        // Add to controls map
        this.controlsMap.set(id, button)

        // Add to checkbox group tracking
        if (!this.checkboxGroups.has(groupName)) {
            this.checkboxGroups.set(groupName, new Set())
        }
        this.checkboxGroups.get(groupName)?.add(id)

        // Add click handler
        button.addEventListener("click", () => {
            // Toggle the checked state
            const isCurrentlyChecked = button.classList.contains("checked")
            if (isCurrentlyChecked) {
                button.classList.remove("checked")
            } else {
                button.classList.add("checked")
            }

            // Call the handler with this button's value and new state
            onToggle(value, !isCurrentlyChecked)
        })

        this.container.appendChild(button)
        return button
    }

    /**
     * Creates a group of checkbox buttons
     */
    addCheckboxGroup(
        groupName: string,
        options: Array<{ id: string; label: string; value: unknown }>,
        initialValues: unknown[] = [],
        onChange: (value: unknown, isChecked: boolean) => void,
    ): HTMLButtonElement[] {
        return options.map((option) =>
            this.addCheckboxButton(
                option.id,
                groupName,
                option.label,
                option.value,
                initialValues.includes(option.value),
                onChange,
            )
        )
    }

    /**
     * Gets all selected values in a checkbox group
     */
    getCheckedValues(groupName: string): unknown[] {
        const values: unknown[] = []
        const groupButtons = this.checkboxGroups.get(groupName) || new Set()

        for (const btnId of groupButtons) {
            const btn = this.getControl<HTMLButtonElement>(btnId)
            if (btn && btn.classList.contains("checked")) {
                values.push(btn.dataset.value)
            }
        }

        return values
    }

    /**
     * Sets the checked state of a button in a checkbox group
     */
    setCheckboxState(
        groupName: string,
        value: unknown,
        isChecked: boolean,
    ): void {
        const groupButtons = this.checkboxGroups.get(groupName) || new Set()

        for (const btnId of groupButtons) {
            const btn = this.getControl<HTMLButtonElement>(btnId)
            if (btn && btn.dataset.value === String(value)) {
                if (isChecked) {
                    btn.classList.add("checked")
                } else {
                    btn.classList.remove("checked")
                }
                break
            }
        }
    }
}
