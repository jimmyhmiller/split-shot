// Adapter for the original benchmark's function bodies. Select dynamic work
// from the entry argument instead of the upstream print(nbody()) driver.
offsetMomentum();
for (let step = 0; step < input; step++) advance(0.01);
return energy();
