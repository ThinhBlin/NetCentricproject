package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// LocalISO is the old backend's datetime format: local, no timezone.
const LocalISO = "2006-01-02T15:04:05.000000"

// LocalTime is a DATETIME that serializes as a local ISO string.
type LocalTime struct{ time.Time }

func (t LocalTime) MarshalJSON() ([]byte, error) {
	if t.IsZero() {
		return []byte("null"), nil
	}
	return json.Marshal(t.Format(LocalISO))
}

func (t *LocalTime) Scan(v any) error {
	switch x := v.(type) {
	case time.Time:
		t.Time = x
	case nil:
		t.Time = time.Time{}
	default:
		return fmt.Errorf("cannot scan %T into LocalTime", v)
	}
	return nil
}

func (t LocalTime) Value() (driver.Value, error) {
	if t.IsZero() {
		return nil, nil
	}
	return t.Time, nil
}
