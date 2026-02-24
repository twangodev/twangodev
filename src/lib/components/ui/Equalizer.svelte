<style>
	.equalizer {
		display: flex;
		align-items: end;
		gap: 1.5px;
		height: 10px;
		flex-shrink: 0;
	}

	.equalizer span {
		width: 2px;
		border-radius: 1px;
		background: currentColor;
		transform-origin: bottom;
		animation: eq 1.2s ease-in-out infinite;
	}

	.equalizer span:nth-child(1) {
		height: 60%;
		animation-delay: 0s;
	}

	.equalizer span:nth-child(2) {
		height: 100%;
		animation-delay: 0.15s;
	}

	.equalizer span:nth-child(3) {
		height: 40%;
		animation-delay: 0.3s;
	}

	@keyframes eq {
		0%,
		100% {
			transform: scaleY(0.3);
		}
		50% {
			transform: scaleY(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.equalizer span {
			animation: none;
		}
	}
</style>

<span class="equalizer" aria-hidden="true">
	<span></span>
	<span></span>
	<span></span>
</span>