# Mitarbeit

## Commits

Die Changelogs dieses Repositories werden automatisch generiert. Das erfordert, dass die Commit-Nachrichten eine gewisse Struktur aufweisen.

```
<Typ>(<Scope>): <Betreff>
<LEERZEILE>
<Beschreibung>
<LEERZEILE>
<Footer>
```

### Typ

| Typ      | Nutzen                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------- |
| feat     | Eine Anpassung am Funktionsumfang (z. B. ein neues Feature oder ein Feature, das entfernt wurde)    |
| fix      | Ein für den Nutzer wahrnehmbarer Bugfix                                                             |
| perf     | Performanceverbesserung                                                                             |
| build    | Änderungen am Buildprozess                                                                          |
| ci       | Änderungen an der CI-Pipeline                                                                       |
| docs     | Änderungen an der Dokumentationen, README.md, CONTRIBUTING.md usw.                                  |
| refactor | Refaktorisierungen                                                                                  |
| revert   | Rücknahme zuvor erstellter Commits                                                                  |
| style    | Änderungen am Code-Style, z. B. der Regeln oder die entsprechende Anwendung im Quellcode            |
| test     | Änderungen an den Tests aller Art                                                                   |
| chore    | "Lästige Arbeit", z. B. Aktualisierung von Paketen oder allem, was nicht zu den anderen Typen passt |

Commits mit den Typen `feat`, `fix` und `perf` werden in das Changelog geschrieben.

### Betreff

- Imperativ
- Großbuchstabe am Anfang
- Kein Punkt am Ende
- Maximal 80 Zeichen
- Wichtig ist zu erfahren, was passiert, wenn der Commit gemergt wird bzw. welche Intention hinter dem Commit steckt. Laufzeitverhalten gehört nicht in den Betreff.

### Beschreibung

Beschreibt gerne ausführlich, warum die Änderung gemacht wurde, was dafür notwendig war und welche Folgen oder offenen Punkte sich aus der Änderung ergeben. Wenn die Änderung einen Breaking Change nach sich zieht, muss in einer gesonderten Zeile `BREAKING CHANGE:` geschrieben werden, wobei in den folgenden Zeilen eine Beschreibung zur Migration erfolgt (siehe Beispiel und weiterführende Links weiter unten).

### Footer

Sollte zumindest die Story- bzw. Fehlerticket-Nummer(n) mit vorangestellter Raute enthalten, um später alle Commits zu finden, die für eine Story notwendig waren. Ticket-Nummern sollten zu diesem Zweck alle vollständig und mit Komma separiert aufgelistet werden, also z. B. `#FL-1234, #FHK-987`.

Die vorangestellte Raute kann aber beim Rebase dafür sorgen, dass die Ticketnummer aus dem Footer entfernt wird. Um das zu verhindern, kann das entsprechende Kommentarzeichen durch ein anderes ersetzt werden: `git config core.commentchar ";"`.

### Beispiel

Eine komplette Commit-Nachricht könnte so aussehen:

```
feat(Shell): Verschiebe die Header- und Footer-Komponenten in die App-Shell

HeaderModule und FooterModule wurden aufgelöst, da sie nach aktuellen Designs
sowie immer nur zusammen mit der App-Shell verwendet werden.

BREAKING CHANGE:
Die Module `HeaderModule` und `FooterModule` existieren nicht mehr. Wenn die
Komponenten (Header, Header-Trenner, Footer usw.) verwendet werden sollen, muss
das `AppShellModule` eingebunden werden.
Außerdem wurden die Selektoren `sf-footer-left`, `sf-footer-center` und
`sf-footer-right` in `sf-content-left`, `sf-content-center` und
`sf-content-right` geändert. Die Komponenten-Namen wurden ebenfalls angepasst.

#XYZ-123
```

### Weitere Lektüre

Auf den folgenden Inhalten basieren die aufgeführten Richtlinien:

- https://chris.beams.io/posts/git-commit/
- https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular
- https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md