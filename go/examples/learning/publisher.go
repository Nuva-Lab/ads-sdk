// Package learning demonstrates customer-backend Skill publication. It is not
// an Agent tool and never gives the conversational Agent an Admin credential.
package learning

import (
	"context"
	"errors"
	nuva "github.com/Nuva-Lab/ads-sdk/go"
)

type Candidate struct {
	ID             string
	CustomerID     string
	SourceEventIDs []string
	Text           string
}
type Publication struct {
	SkillName  string
	Definition nuva.SkillRegistration
	// Activate requests an explicit main switch after registration. The first
	// version of a new Skill becomes main even when Activate is false.
	Activate bool
}
type Result struct {
	Registered nuva.RegisteredSkill
	// Activated reports whether the registered version is main in the last
	// successful API response, including registration's first-version selection.
	Activated bool
}
type Publisher struct {
	Admin      *nuva.AdminClient
	CustomerID string
	// Read is a trusted private-source adapter, never an unauthenticated browser URL.
	Read func(context.Context, string) (Candidate, error)
	// Prepare enforces customer policy and constructs the COMPLETE next Skill.
	// A watcher suggestion alone is not a replacement for the existing Skill files.
	// If publication must remain inactive, reject creation of a new Skill: its
	// first registered version automatically becomes main.
	Prepare func(context.Context, Candidate) (Publication, error)
}

func (p Publisher) Publish(ctx context.Context, id string) (Result, error) {
	var result Result
	if p.Admin == nil || p.CustomerID == "" || p.Read == nil || p.Prepare == nil {
		return result, errors.New("learning publisher requires Admin client and trusted candidate/policy adapters")
	}
	candidate, err := p.Read(ctx, id)
	if err != nil {
		return result, err
	}
	if candidate.ID != id || candidate.CustomerID != p.CustomerID || len(candidate.SourceEventIDs) == 0 {
		return result, errors.New("candidate identity, tenant or provenance is invalid")
	}
	publication, err := p.Prepare(ctx, candidate)
	if err != nil {
		return result, err
	}
	registered, err := p.Admin.RegisterSkill(ctx, publication.SkillName, publication.Definition)
	if err != nil {
		return result, err
	}
	result.Registered = registered
	result.Activated = registered.Skill.MainVersion != nil && *registered.Skill.MainVersion == registered.Version.Version
	if publication.Activate {
		main, err := p.Admin.SetSkillMain(ctx, publication.SkillName, registered.Version.Version)
		if err != nil {
			return result, err
		} // Preserve registration receipt even when activation fails.
		result.Registered.Skill = main
		result.Activated = main.MainVersion != nil && *main.MainVersion == registered.Version.Version
	}
	return result, nil
}
