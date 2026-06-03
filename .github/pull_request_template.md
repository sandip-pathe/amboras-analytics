## Summary

- Add a short summary of the change.

## Verification

- [ ] `cd backend && npm audit --audit-level=moderate`
- [ ] `cd backend && npm run build`
- [ ] `cd backend && npm test -- --runInBand`
- [ ] `cd backend && npm run test:e2e -- --runInBand`
- [ ] `cd backend && node --check scripts/live-demo.js`
- [ ] `cd frontend && npm audit --audit-level=moderate`
- [ ] `cd frontend && npm run build`
- [ ] `cd frontend && npm run lint`

## Notes

- Add any follow-up notes or deployment caveats.
