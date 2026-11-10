	.build_version macos, 26, 5	sdk_version 26, 5
	.section	__TEXT,__text,regular,pure_instructions
	.globl	_numeric_main                   ; -- Begin function numeric_main
	.p2align	2
_numeric_main:                          ; @numeric_main
	.cfi_startproc
; %bb.0:
	stp	d9, d8, [sp, #-32]!             ; 16-byte Folded Spill
	stp	x29, x30, [sp, #16]             ; 16-byte Folded Spill
	add	x29, sp, #16
	.cfi_def_cfa w29, 16
	.cfi_offset w30, -8
	.cfi_offset w29, -16
	.cfi_offset b8, -24
	.cfi_offset b9, -32
	mov.16b	v8, v0
	fmov	d1, #3.00000000
	bl	_fmod
	fmov	d1, #9.00000000
	fmov	d2, #1.00000000
	fmov	d3, #2.00000000
	fcmp	d0, d3
	fmov	d3, #10.00000000
	fmov	d4, #7.00000000
	fcsel	d3, d4, d3, ne
	fcmp	d0, d2
	fcsel	d1, d1, d3, eq
	fadd	d2, d8, d4
	fcmp	d0, #0.0
	fcsel	d0, d1, d2, ne
	ldp	x29, x30, [sp, #16]             ; 16-byte Folded Reload
	ldp	d9, d8, [sp], #32               ; 16-byte Folded Reload
	ret
	.cfi_endproc
                                        ; -- End function
.subsections_via_symbols
