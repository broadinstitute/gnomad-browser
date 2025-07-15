package queries

import "fmt"

// VariantNotFoundError indicates a variant was not found.
type VariantNotFoundError struct {
	ID      string
	Dataset string
}

func (e *VariantNotFoundError) Error() string {
	return fmt.Sprintf("variant %s not found in dataset %s", e.ID, e.Dataset)
}

// DatasetNotSupportedError indicates an unsupported dataset.
type DatasetNotSupportedError struct {
	Dataset string
}

func (e *DatasetNotSupportedError) Error() string {
	return fmt.Sprintf("dataset %s is not supported", e.Dataset)
}
